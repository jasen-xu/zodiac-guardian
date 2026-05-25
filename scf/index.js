/**
 * 十二生肖守护神 - 腾讯云 SCF 云函数
 * 同时托管前端页面和 AI 解卦 API
 * 
 * 环境变量：
 *   DASHSCOPE_API_KEY - 通义千问 API Key（必填）
 *   MODEL - AI 模型（可选，默认 qwen-plus）
 */

const fs = require('fs');
const path = require('path');

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const MODEL = process.env.MODEL || 'qwen-plus';

// 静态文件 MIME 类型映射
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

// 静态文件根目录（打包时 static/ 文件夹与 index.js 同级）
const STATIC_ROOT = path.join(__dirname, 'static');

/**
 * 提供静态文件
 */
function serveStatic(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
        const fullPath = path.join(STATIC_ROOT, filePath);
        // 安全检查：防止路径穿越
        if (!fullPath.startsWith(STATIC_ROOT)) {
            return null;
        }
        const content = fs.readFileSync(fullPath);
        const isBase64 = !contentType.startsWith('text') && !contentType.includes('javascript') && !contentType.includes('json');
        return {
            isBase64Encoded: isBase64,
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400'
            },
            body: isBase64 ? content.toString('base64') : content.toString('utf-8')
        };
    } catch (e) {
        return null;
    }
}

// 易经解卦系统提示词
const SYSTEM_PROMPT = `你是一位精通易经六爻占卜的大师，拥有数十年的解卦经验。你深谙《易经》、《增删卜易》、《卜筮正宗》等经典著作，能够结合纳甲、六亲、六神、世应等专业知识进行深度解读。

解卦要求：
1. 首先解读卦象本身含义（卦名、卦义、上下卦关系）
2. 结合纳甲、六亲、六神分析各爻的吉凶
3. 分析世应关系，判断事情的发展趋势
4. 针对问卦者的具体问题给出明确的解答
5. 给出实用的建议和注意事项

语言风格：
- 使用通俗易懂的现代汉语，适当引用经典原文
- 态度温和、积极正面，即使卦象不佳也要给出希望
- 条理清晰，分段论述
- 总字数控制在500-800字之间`;

/**
 * 调用通义千问 API
 */
async function callQwenAPI(question, hexagramInfo) {
    const userPrompt = `请为我解读以下卦象：

问卦之事：${question}

卦象信息：
- 卦名：${hexagramInfo.name}
- 卦符：${hexagramInfo.symbol}
- 卦义：${hexagramInfo.meaning}
- 宫位：${hexagramInfo.palace || '未知'}
- 五行：${hexagramInfo.element || '未知'}
- 分类：${hexagramInfo.category || '未知'}
- 吉凶：${hexagramInfo.fortune || '未知'}
${hexagramInfo.najia ? `- 纳甲：${hexagramInfo.najia.positions?.join('、') || '未知'}` : ''}
${hexagramInfo.liuqin ? `- 六亲：${hexagramInfo.liuqin.join('、')}` : ''}
${hexagramInfo.liushen ? `- 六神：${hexagramInfo.liushen.join('、')}` : ''}

当前时间：${new Date().toLocaleString('zh-CN')}

请结合以上信息，针对我所问之事进行详细解读。`;

    const requestBody = {
        model: MODEL,
        input: {
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ]
        },
        parameters: {
            result_format: 'message',
            max_tokens: 1500,
            temperature: 0.7,
            top_p: 0.9
        }
    };

    const response = await fetch(DASHSCOPE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('通义千问 API 错误:', response.status, errorText);
        throw new Error(`AI服务返回错误: ${response.status}`);
    }

    const data = await response.json();

    if (data.output && data.output.choices && data.output.choices[0]) {
        return data.output.choices[0].message.content;
    }

    throw new Error('AI服务返回格式异常');
}

/**
 * 构建 API 网关响应
 */
function buildResponse(statusCode, body) {
    return {
        isBase64Encoded: false,
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        },
        body: JSON.stringify(body)
    };
}

/**
 * SCF 入口函数
 */
exports.main_handler = async (event, context) => {
    // 解析 API 网关事件
    const httpMethod = event.httpMethod || (event.requestContext && event.requestContext.httpMethod) || 'GET';
    let reqPath = event.path || '/';

    // 处理 OPTIONS 预检请求
    if (httpMethod === 'OPTIONS') {
        return buildResponse(200, { status: 'ok' });
    }

    // ========== API 路由 ==========

    // POST /api/divine - AI 解卦
    if (reqPath.includes('/api/divine') && httpMethod === 'POST') {
        try {
            let body = event.body || '{}';
            if (event.isBase64Encoded) {
                body = Buffer.from(body, 'base64').toString('utf-8');
            }
            const params = JSON.parse(body);

            const {
                question, hexagramName, hexagramSymbol, meaning,
                lines, category, fortune, najia, liuqin, liushen, shiying
            } = params;

            if (!question || !hexagramName) {
                return buildResponse(400, {
                    success: false,
                    error: '缺少必要参数：question（问题）和 hexagramName（卦名）'
                });
            }

            if (!DASHSCOPE_API_KEY) {
                return buildResponse(500, {
                    success: false,
                    error: '未配置 DASHSCOPE_API_KEY，请在云函数环境变量中设置'
                });
            }

            const hexagramInfo = {
                name: hexagramName,
                symbol: hexagramSymbol || '',
                meaning: meaning || '',
                lines: lines || [],
                category: category || '',
                fortune: fortune || '',
                najia: najia || null,
                palace: najia?.palace || '',
                element: najia?.element || '',
                liuqin: liuqin || [],
                liushen: liushen || [],
                shiying: shiying || null
            };

            console.log(`[解卦] 问题: "${question}", 卦名: ${hexagramName}`);
            const interpretation = await callQwenAPI(question, hexagramInfo);

            return buildResponse(200, {
                success: true,
                data: {
                    question, hexagramName, interpretation,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('解卦接口错误:', error.message);
            return buildResponse(500, {
                success: false,
                error: error.message || '服务器内部错误'
            });
        }
    }

    // GET /api/health - 健康检查
    if (reqPath.includes('/api/health') && httpMethod === 'GET') {
        return buildResponse(200, {
            status: 'ok',
            service: 'zodiac-guardian-scf',
            aiConfigured: !!DASHSCOPE_API_KEY,
            model: MODEL
        });
    }

    // ========== 静态文件路由 ==========

    // 根路径 -> index.html
    if (reqPath === '/') {
        reqPath = '/index.html';
    }

    // 尝试提供静态文件
    const staticResponse = serveStatic(reqPath);
    if (staticResponse) {
        return staticResponse;
    }

    // 未找到文件，返回 index.html（支持前端路由）
    const indexResponse = serveStatic('/index.html');
    if (indexResponse) {
        return indexResponse;
    }

    // 404
    return buildResponse(404, {
        success: false,
        error: `未找到: ${httpMethod} ${reqPath}`
    });
};
