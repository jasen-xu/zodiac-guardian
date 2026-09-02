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
const WECOM_WEBHOOK_KEY = process.env.WECOM_WEBHOOK_KEY || 'b2c597a8-9358-44fb-9823-d2f8835be74b';
const SHANGHAI_API_URL = process.env.SHANGHAI_API_URL || '';  // 上海服务器API地址
const SHANGHAI_API_KEY = process.env.SHANGHAI_API_KEY || '';  // 上海服务器API密钥
const PORT = process.env.PORT || 9000;

// ========== JWT 解码（仅提取payload，不验证签名） ==========
function decodeJWT(token) {
    try {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        // 检查是否过期
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch (e) {
        return null;
    }
}

// 从请求中提取用户信息
function extractUser(req) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const decoded = decodeJWT(token);
    return decoded ? { userId: decoded.id, phone: decoded.phone, level: decoded.level } : null;
}

// 提取客户端IP
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.connection?.remoteAddress
        || '';
}

// 调用上海服务器检查额度
async function checkQuota(user, ip, serviceType) {
    if (!SHANGHAI_API_URL || !SHANGHAI_API_KEY) return { allowed: true }; // 未配置则不限制
    try {
        const resp = await fetch(`${SHANGHAI_API_URL}/api/user/check-quota`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': SHANGHAI_API_KEY },
            body: JSON.stringify({
                userId: user?.userId || null,
                phone: user?.phone || ip,
                serviceType
            })
        });
        return await resp.json();
    } catch (e) {
        console.error('[额度检查] 网络错误:', e.message);
        return { allowed: true }; // 网络错误时放行，避免阻断服务
    }
}

// 调用上海服务器消耗额度
async function consumeQuota(user, ip, serviceType) {
    if (!SHANGHAI_API_URL || !SHANGHAI_API_KEY) return;
    try {
        await fetch(`${SHANGHAI_API_URL}/api/user/consume-quota`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': SHANGHAI_API_KEY },
            body: JSON.stringify({
                userId: user?.userId || null,
                phone: user?.phone || ip,
                serviceType
            })
        });
    } catch (e) {
        console.error('[额度消耗] 网络错误:', e.message);
    }
}

// ========== 认证代理（转发到上海服务器） ==========
async function handleAuthProxy(req, res, url) {
    if (!SHANGHAI_API_URL) {
        return sendJSON(res, 503, { success: false, error: '服务器未配置' });
    }
    // 读取请求体（POST/PUT）
    let body = null;
    if (req.method === 'POST' || req.method === 'PUT') {
        body = await new Promise(resolve => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => resolve(data));
        });
    }
    const targetPath = url.pathname;
    try {
        const resp = await fetch(`${SHANGHAI_API_URL}${targetPath}`, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                ...(req.headers['authorization'] ? { 'Authorization': req.headers['authorization'] } : {})
            },
            body
        });
        const text = await resp.text();
        try {
            return sendJSON(res, resp.status, JSON.parse(text));
        } catch (e) {
            res.writeHead(resp.status, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
            return res.end(text);
        }
    } catch (e) {
        console.error('[认证代理] 错误:', e.message);
        return sendJSON(res, 502, { success: false, error: '代理请求失败' });
    }
}

// ========== 商品数据与图片代理（转发到上海服务器） ==========
async function handleProductsAPI(req, res) {
    if (!SHANGHAI_API_URL) {
        return sendJSON(res, 503, { success: false, error: '服务器未配置' });
    }
    // 20 秒超时：避免上游偶发变慢时函数被网关强杀、看不到真实错误
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
        const resp = await fetch(`${SHANGHAI_API_URL}/api/products`, {
            headers: { 'Accept': 'application/json', 'Accept-Encoding': 'identity' },
            signal: ctrl.signal
        });
        // 先 text() 再 JSON.parse（对齐登录转发写法）：规避部分 Node 运行时 resp.json()
        // 对含中文多字节响应的兼容问题——这正是登录转发正常、商品转发 502 的根因
        const text = await resp.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (pe) {
            // 上游返回的不是合法 JSON：回传状态码与内容片段，便于远程诊断
            return sendJSON(res, 502, { success: false, error: '上游响应非JSON', status: resp.status, len: text.length, preview: text.slice(0, 200) });
        }
        return sendJSON(res, resp.status, data);
    } catch (e) {
        const detail = String((e && e.message) || e);
        const cause = e && e.cause ? String(e.cause.message || e.cause.code || e.cause) : '';
        console.error('[商品代理] 错误:', detail, cause);
        return sendJSON(res, 502, { success: false, error: '代理请求失败', detail, cause });
    } finally {
        clearTimeout(timer);
    }
}

// 商品图片代理（仅限 /uploads/products/ 前缀，避免任意路径转发）
async function handleUploadsProxy(req, res, url) {
    if (!SHANGHAI_API_URL || !url.pathname.startsWith('/uploads/products/')) {
        res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
        return res.end();
    }
    try {
        const resp = await fetch(`${SHANGHAI_API_URL}${url.pathname}`);
        if (!resp.ok) {
            res.writeHead(resp.status, { 'Access-Control-Allow-Origin': '*' });
            return res.end();
        }
        const buf = Buffer.from(await resp.arrayBuffer());
        res.writeHead(200, {
            'Content-Type': resp.headers.get('content-type') || getMimeType(url.pathname),
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=604800'
        });
        res.end(buf);
    } catch (e) {
        console.error('[图片代理] 错误:', e.message);
        res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
        res.end();
    }
}

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
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
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

                // 额度检查
                const user = extractUser(req);
                const clientIP = getClientIP(req);
                const quota = await checkQuota(user, clientIP, 'divine');
                if (quota.success && !quota.data?.allowed) {
                    return sendJSON(res, 403, {
                        success: false,
                        error: quota.data?.remaining === 0
                            ? (user ? '本月解卦次数已用完，下月刷新' : '今日免费体验次数已用完，请登录获取更多次数')
                            : '额度不足'
                    });
                }

                console.log(`[解卦] 问题: "${question}", 卦名: ${hexagramName}, 用户: ${user?.userId || '游客'}`);
                const interpretation = await callQwenAPI(question, {
                    name: hexagramName, symbol: hexagramSymbol || '', meaning: meaning || '',
                    lines: lines || [], category: category || '', fortune: fortune || '',
                    najia: najia || null, palace: najia?.palace || '', element: najia?.element || '',
                    liuqin: liuqin || [], liushen: liushen || [], shiying: shiying || null
                });

                // 解卦成功，消耗额度
                await consumeQuota(user, clientIP, 'divine');

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

                // 额度检查
                const user = extractUser(req);
                const clientIP = getClientIP(req);
                const quota = await checkQuota(user, clientIP, 'bazi');
                if (quota.success && !quota.data?.allowed) {
                    return sendJSON(res, 403, {
                        success: false,
                        error: quota.data?.remaining === 0
                            ? (user ? '本月八字分析次数已用完，下月刷新' : '八字分析需要登录后使用')
                            : '额度不足'
                    });
                }

                console.log(`[八字] ${birthDate}, 日主: ${dayMaster}, 用户: ${user?.userId || '游客'}`);
                const interpretation = await callBaziQwenAPI({
                    yearPillar, monthPillar, dayPillar, hourPillar,
                    dayMaster, dayMasterElement, fiveElements, hiddenElements,
                    gender, birthDate
                });

                // 分析成功，消耗额度
                await consumeQuota(user, clientIP, 'bazi');

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

// ========== 预约表单处理 ==========

async function sendWecomNotification(booking) {
    const webhookUrl = `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${WECOM_WEBHOOK_KEY}`;
    const typeMap = { survey: '生命地理勘测', ceremony: '生命礼仪全案', heritage: '家族文化建档', selection: '选址分析', layout: '空间布局', decor: '软装搭配', other: '其他需求' };
    const typeName = typeMap[booking.type] || booking.type || '未指定';
    const source = booking.source || '祖庭服务';
    
    const content = [
        `\uD83D\uDCCB \u65B0\u9884\u7EA6\u63D0\u4EA4`,
        `\u6765\u6E90\uFF1A${source}`,
        `\u59D3\u540D\uFF1A${booking.name}`,
        `\u624B\u673A\uFF1A${booking.phone}`,
        `\u5730\u533A\uFF1A${booking.area || '\u672A\u586B'}`,
        `\u670D\u52A1\u7C7B\u578B\uFF1A${typeName}`,
        `\u9700\u6C42\uFF1A${booking.desc || '\u672A\u586B'}`,
        `\u63D0\u4EA4\u65F6\u95F4\uFF1A${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
    ].join('\n');

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            msgtype: 'text',
            text: { content }
        })
    });

    if (!response.ok) {
        console.error('企微通知发送失败:', response.status);
        return false;
    }
    const result = await response.json();
    console.log('企微通知结果:', result);
    return result.errcode === 0;
}

async function handleBookingAPI(req, res) {
    try {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', async () => {
            try {
                const booking = JSON.parse(Buffer.concat(chunks).toString());
                
                // 基本验证
                if (!booking.name || !booking.phone) {
                    return sendJSON(res, 400, { success: false, error: '请填写姓名和手机号' });
                }
                if (!/^1\d{10}$/.test(booking.phone)) {
                    return sendJSON(res, 400, { success: false, error: '手机号格式不正确' });
                }

                console.log(`[预约] ${booking.name}, ${booking.phone}, ${booking.type || 'other'}`);
                
                // 发送企微通知
                const notified = await sendWecomNotification(booking);
                
                // 存入上海服务器数据库（非阻塞，失败不影响通知）
                let saved = false;
                if (SHANGHAI_API_URL && SHANGHAI_API_KEY) {
                    try {
                        const saveResp = await fetch(`${SHANGHAI_API_URL}/api/bookings`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-API-Key': SHANGHAI_API_KEY },
                            body: JSON.stringify(booking)
                        });
                        const saveResult = await saveResp.json();
                        saved = saveResult.success;
                        console.log(`[存库] ${saved ? '成功' : '失败'}:`, saveResult);
                    } catch (e) {
                        console.error('[存库] 网络错误:', e.message);
                    }
                }
                
                sendJSON(res, 200, { 
                    success: true, 
                    message: '预约提交成功，我们将48小时内联系您',
                    notified,
                    saved
                });
            } catch (e) {
                console.error('预约处理错误:', e.message);
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
            'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        });
        return res.end();
    }

    // API 路由
    if (url.pathname === '/api/divine' && method === 'POST') return handleDivineAPI(req, res);
    if (url.pathname === '/api/bazi' && method === 'POST') return handleBaziAPI(req, res);
    if (url.pathname === '/api/booking' && method === 'POST') return handleBookingAPI(req, res);
    if (url.pathname === '/api/products' && method === 'GET') return handleProductsAPI(req, res);
    if (url.pathname.startsWith('/uploads/products/') && method === 'GET') return handleUploadsProxy(req, res, url);
    // 认证 & 用户 API 代理（转发到上海服务器）
    if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/user/')) {
        return handleAuthProxy(req, res, url);
    }
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
