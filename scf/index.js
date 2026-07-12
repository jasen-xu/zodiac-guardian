/**
 * 十二生肖守护神 - 腾讯云 SCF Web 函数
 * 使用原生 HTTP 服务器，同时托管前端页面和 AI 解卦 API
 * 
 * 环境变量：
 *   DASHSCOPE_API_KEY - 通义千问 API Key（必填）
 *   MODEL - AI 模型（可选，默认 qwen-plus）
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const MODEL = process.env.MODEL || 'qwen-plus';
const PORT = process.env.PORT || 9000;

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

const STATIC_ROOT = path.join(__dirname, 'static');

// 易经解卦系统提示词
const SYSTEM_PROMPT = `你是一位精通易经六爻文化的易学研究者，深谙《易经》、《增删卜易》、《卜筮正宗》等经典著作，能够结合纳甲、六亲、六神、世应等专业知识进行深度解读。

解卦要求：
1. 首先解读卦象本身含义（卦名、卦义、上下卦关系）
2. 结合纳甲、六亲、六神分析各爻的宜忌
3. 分析世应关系，解读事情的发展趋势
4. 针对问卦者的具体问题给出解答
5. 给出实用的建议和注意事项

内容规范：
- 请以“文化解析”视角进行解读，避免使用“预测”“算命”“注定”等用语
- 不得给出“一定会”“必定”“注定”等确定性预言
- 在回复末尾附加“以上分析仅供文化参考”

语言风格：
- 使用通俗易懂的现代汉语，适当引用经典原文
- 态度温和、积极正面，即使卦象提示审慎也要给出希望
- 条理清晰，分段论述
- 总字数控制在500-800字之间`;

// ========== 工具函数 ==========

function getMimeType(filePath) {
    return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
    const fullPath = path.join(STATIC_ROOT, filePath);
    if (!fullPath.startsWith(STATIC_ROOT)) { return false; }
    try {
        const content = fs.readFileSync(fullPath);
        const mime = getMimeType(filePath);
        // 用纯 text/html（不加 charset），避免浏览器误判
        const ct = mime.startsWith('text/html') ? 'text/html' : mime;
        res.setHeader('Content-Type', ct);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.writeHead(200);
        res.end(content);
        return true;
    } catch (e) {
        return false;
    }
}

// ========== AI 解卦 ==========

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

    const response = await fetch(DASHSCOPE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODEL,
            input: {
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ]
            },
            parameters: { result_format: 'message', max_tokens: 1500, temperature: 0.7, top_p: 0.9 }
        })
    });

    if (!response.ok) throw new Error(`AI服务返回错误: ${response.status}`);
    const data = await response.json();
    if (data.output?.choices?.[0]) return data.output.choices[0].message.content;
    throw new Error('AI服务返回格式异常');
}

async function handleDivineAPI(req, res) {
    try {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', async () => {
            try {
                const params = JSON.parse(Buffer.concat(chunks).toString());
                const { question, hexagramName, hexagramSymbol, meaning, lines, category, fortune, najia, liuqin, liushen, shiying } = params;

                if (!question || !hexagramName) {
                    return sendJSON(res, 400, { success: false, error: '缺少必要参数' });
                }
                if (!DASHSCOPE_API_KEY) {
                    return sendJSON(res, 500, { success: false, error: '服务器未配置 AI Key' });
                }

                console.log(`[解卦] 问题: "${question}", 卦名: ${hexagramName}`);
                const interpretation = await callQwenAPI(question, {
                    name: hexagramName, symbol: hexagramSymbol || '', meaning: meaning || '',
                    lines: lines || [], category: category || '', fortune: fortune || '',
                    najia: najia || null, palace: najia?.palace || '', element: najia?.element || '',
                    liuqin: liuqin || [], liushen: liushen || [], shiying: shiying || null
                });

                sendJSON(res, 200, { success: true, data: { question, hexagramName, interpretation, timestamp: new Date().toISOString() } });
            } catch (e) {
                console.error('解卦错误:', e.message);
                sendJSON(res, 500, { success: false, error: e.message });
            }
        });
    } catch (e) {
        sendJSON(res, 500, { success: false, error: e.message });
    }
}

// ========== 八字五行分析 ==========

const BAZI_SYSTEM_PROMPT = `你是一位精通八字命理文化的命理文化研究者，深谙《子平真诠》、《滴天髓》、《穷通宝鉴》、《三命通会》等经典命理著作，拥有丰富的八字文化分析经验。

分析要求（严格按照子平八字体系）：

1. **日主分析**：
   - 分析日干（日主）的五行属性及其在八字中的强弱
   - 结合月令（月支）判断日主得令与否
   - 分析四柱天干地支对日主的生克关系

2. **喜用神与忌神**：
   - 根据日主强弱确定喜用神（补益的五行）
   - 明确忌神（克泄的五行）
   - 说明喜用神选择的理由

3. **五行缺失与旺衰**：
   - 详细分析八字中五行的分布情况
   - 指出缺失或偏弱的五行
   - 分析过旺的五行及其影响

4. **增补建议**（针对五行缺失或偏弱）：
   - **方位**：适合的方位（如东方属木、南方属火等）
   - **颜色**：日常穿戴、家居宜用颜色
   - **饰品**：适合佩戴的材质和颜色
   - **职业**：适合的行业方向（结合五行属性）
   - **饮食**：五行对应的食疗建议
   - **植物/宠物**：适合养殖的植物或宠物

内容规范：
- 请以“文化解析”视角进行解读，避免使用“算命”“注定”等用语
- 不得给出“一定会”“必定”等确定性预言
- 在回复末尾附加“以上分析仅供文化参考”

语言风格：
- 专业但不晦涩，用通俗语言解释专业术语
- 条理清晰，分点论述
- 态度温和积极，给出建设性建议
- 总字数控制在800-1200字之间`;

async function callBaziQwenAPI(baziData) {
    const pillarStr = [
        `年柱：${baziData.yearPillar.gan}${baziData.yearPillar.zhi}`,
        `月柱：${baziData.monthPillar.gan}${baziData.monthPillar.zhi}`,
        `日柱：${baziData.dayPillar.gan}${baziData.dayPillar.zhi}`,
        `时柱：${baziData.hourPillar.gan}${baziData.hourPillar.zhi}`
    ].join('、');

    const wxStr = Object.entries(baziData.fiveElements).map(([k, v]) => `${k}: ${v}`).join('、');
    const hiddenStr = Object.entries(baziData.hiddenElements).map(([k, v]) => `${k}: ${v}`).join('、');

    const userPrompt = `请为我分析以下八字命理：

出生信息：${baziData.birthDate}
性别：${baziData.gender === 'male' ? '男' : '女'}

四柱八字：${pillarStr}
日主：${baziData.dayMaster}（${baziData.dayMasterElement}）

五行分布（天干地支）：${wxStr}
藏干五行（辅助）：${hiddenStr}

请严格按照子平八字体系，分析日主强弱、喜用神、忌神、五行缺失，并给出详细的增补建议。`;

    const response = await fetch(DASHSCOPE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MODEL,
            input: {
                messages: [
                    { role: 'system', content: BAZI_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ]
            },
            parameters: { result_format: 'message', max_tokens: 2000, temperature: 0.7, top_p: 0.9 }
        })
    });

    if (!response.ok) throw new Error(`AI服务返回错误: ${response.status}`);
    const data = await response.json();
    if (data.output?.choices?.[0]) return data.output.choices[0].message.content;
    throw new Error('AI服务返回格式异常');
}

async function handleBaziAPI(req, res) {
    try {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', async () => {
            try {
                const params = JSON.parse(Buffer.concat(chunks).toString());
                const { yearPillar, monthPillar, dayPillar, hourPillar, dayMaster, dayMasterElement, fiveElements, hiddenElements, gender, birthDate } = params;

                if (!yearPillar || !dayPillar || !dayMaster) {
                    return sendJSON(res, 400, { success: false, error: '缺少必要的八字数据' });
                }
                if (!DASHSCOPE_API_KEY) {
                    return sendJSON(res, 500, { success: false, error: '服务器未配置 AI Key' });
                }

                console.log(`[八字] ${birthDate}, 日主: ${dayMaster}`);
                const interpretation = await callBaziQwenAPI({
                    yearPillar, monthPillar, dayPillar, hourPillar,
                    dayMaster, dayMasterElement, fiveElements, hiddenElements,
                    gender, birthDate
                });

                sendJSON(res, 200, { success: true, data: { interpretation, timestamp: new Date().toISOString() } });
            } catch (e) {
                console.error('八字分析错误:', e.message);
                sendJSON(res, 500, { success: false, error: e.message });
            }
        });
    } catch (e) {
        sendJSON(res, 500, { success: false, error: e.message });
    }
}

// ========== HTTP 服务器 ==========

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const method = req.method.toUpperCase();

    // CORS 预检
    if (method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    // API 路由
    if (url.pathname === '/api/divine' && method === 'POST') return handleDivineAPI(req, res);
    if (url.pathname === '/api/bazi' && method === 'POST') return handleBaziAPI(req, res);
    if (url.pathname === '/api/health') return sendJSON(res, 200, { status: 'ok', aiConfigured: !!DASHSCOPE_API_KEY, model: MODEL });

    // 静态文件
    let filePath = url.pathname;
    if (filePath === '/') filePath = '/index.html';
    if (!path.extname(filePath)) filePath += '.html'; // 无扩展名自动补 .html

    if (sendFile(res, filePath)) return;

    // SPA 兜底
    if (sendFile(res, '/index.html')) return;

    sendJSON(res, 404, { success: false, error: `未找到: ${method} ${url.pathname}` });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏮 十二生肖守护神 Web 函数已启动，端口: ${PORT}`);
});
