require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务（同时提供前端页面）
app.use(express.static(path.join(__dirname, '..')));

// 通义千问 API 配置
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const DASHSCOPE_API_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const MODEL = process.env.MODEL || 'qwen-plus';

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
 * 调用通义千问 API 进行 AI 解卦
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
 * POST /api/divine - AI 智能解卦接口
 */
app.post('/api/divine', async (req, res) => {
    try {
        const { question, hexagramName, hexagramSymbol, meaning, lines, category, fortune, najia, liuqin, liushen, shiying } = req.body;

        if (!question || !hexagramName) {
            return res.status(400).json({
                success: false,
                error: '缺少必要参数：question（问题）和 hexagramName（卦名）'
            });
        }

        if (!DASHSCOPE_API_KEY) {
            return res.status(500).json({
                success: false,
                error: '服务器未配置 DASHSCOPE_API_KEY，请在 .env 文件中配置通义千问 API Key'
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

        res.json({
            success: true,
            data: {
                question: question,
                hexagramName: hexagramName,
                interpretation: interpretation,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('解卦接口错误:', error.message);
        res.status(500).json({
            success: false,
            error: error.message || '服务器内部错误'
        });
    }
});

/**
 * GET /api/health - 健康检查
 */
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'zodiac-guardian-server',
        aiConfigured: !!DASHSCOPE_API_KEY,
        model: MODEL
    });
});

// 兜底路由 - 返回 index.html（SPA 模式）
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 仅在非 Vercel 环境下启动监听
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🏮 十二生肖守护神后端服务已启动`);
        console.log(`📡 服务地址: http://localhost:${PORT}`);
        console.log(`🤖 AI解卦接口: http://localhost:${PORT}/api/divine`);
        console.log(`🔑 API Key 配置: ${DASHSCOPE_API_KEY ? '✅ 已配置' : '❌ 未配置（请在 .env 文件中设置 DASHSCOPE_API_KEY）'}`);
        console.log(`🧠 AI 模型: ${MODEL}`);
    });
}

module.exports = app;
