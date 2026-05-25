// 六爻问卦逻辑
let currentQuestion = '';

// 开始起卦
function startDivination() {
    const question = document.getElementById('questionInput').value.trim();
    
    if (!question) {
        alert('请输入您所问之事!');
        return;
    }
    
    currentQuestion = question;
    
    // 显示起卦动画
    document.getElementById('questionSection').style.display = 'none';
    document.getElementById('diviningAnimation').style.display = 'block';
    
    // 模拟起卦过程
    setTimeout(() => {
        performDivination();
    }, 2000);
}

// 执行起卦
function performDivination() {
    // 随机选择一卦
    const randomIndex = Math.floor(Math.random() * hexagramData.length);
    const hexagram = hexagramData[randomIndex];
    
    // 隐藏动画
    document.getElementById('diviningAnimation').style.display = 'none';
    
    // 显示卦象结果
    displayHexagram(hexagram);
}

// 显示卦象
function displayHexagram(hexagram) {
    document.getElementById('hexagramResult').style.display = 'block';
    
    // 显示卦名
    document.getElementById('hexagramName').textContent = hexagram.name;
    
    // 显示卦符
    document.getElementById('hexagramSymbol').textContent = hexagram.symbol;
    
    // 显示卦义
    document.getElementById('hexagramMeaning').textContent = hexagram.meaning;
    
    // 显示六爻
    const linesContainer = document.getElementById('hexagramLines');
    linesContainer.innerHTML = '';
    for (let i = 5; i >= 0; i--) {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'hexagram-line';
        const isYang = hexagram.lines[i] === '阳';
        lineDiv.innerHTML = `
            <span class="line-position">第${i + 1}爻</span>
            <div class="line-symbol ${isYang ? 'yang-line' : 'yin-line'}"></div>
            <span class="line-type">${hexagram.lines[i]}爻</span>
        `;
        linesContainer.appendChild(lineDiv);
    }
    
    // 显示卦象解读
    document.getElementById('interpContent').innerHTML = `
        <p>${hexagram.interpretation}</p>
        <p><strong>建议：</strong>${hexagram.advice}</p>
    `;
    
    // 使用专业解读系统生成综合解答
    if (typeof LiuyaoProfessional !== 'undefined' && currentQuestion) {
        const professional = new LiuyaoProfessional(hexagram, currentQuestion);
        const professionalHTML = professional.generateHTML();
        document.getElementById('answerContent').innerHTML = professionalHTML;
    } else {
        // 备用方案
        const answer = generateAnswer(hexagram, currentQuestion);
        document.getElementById('answerContent').innerHTML = `<p>${answer}</p>`;
    }

    // 添加 AI 智能解卦按钮
    const aiButtonHTML = `
        <div class="ai-divine-section" style="margin-top: 20px; text-align: center;">
            <button class="ai-divine-button" onclick="requestAIDivination()" style="
                background: linear-gradient(135deg, #8b4513 0%, #a0522d 100%);
                color: #fff8eb;
                border: none;
                padding: 14px 32px;
                font-size: 16px;
                border-radius: 30px;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(139, 69, 19, 0.4);
                transition: all 0.3s ease;
            ">✨ 大师解卦</button>
            <p style="color: #6b4423; font-size: 12px; margin-top: 8px;">AI 大师结合易经专业知识，为您深度解读卦象</p>
            <div id="aiResult" style="display: none; margin-top: 20px; text-align: left;"></div>
        </div>
    `;
    document.getElementById('answerContent').innerHTML += aiButtonHTML;
}

// 生成综合解答
function generateAnswer(hexagram, question) {
    let answer = '';
    
    // 根据卦象吉凶判断
    const auspiciousHexagrams = ['乾为天', '坤为地', '地天泰', '天火同人', '火天大有', '地山谦', '雷地豫', '天雷无妄', '山天大畜', '火地晋', '风火家人', '风雷益', '地风升', '泽火革', '火风鼎', '雷火丰', '水火既济'];
    const inauspiciousHexagrams = ['天水讼', '天地否', '山地剥', '地火明夷', '水风井', '泽水困', '风山渐', '雷泽归妹', '火山旅', '巽为风', '兑为泽', '风水涣', '水泽节', '风泽中孚', '雷山小过'];
    
    let fortune = '';
    let fortuneLevel = '';
    if (auspiciousHexagrams.includes(hexagram.name)) {
        fortune = '此卦为吉卦，预示着好的发展趋势。';
        fortuneLevel = '吉';
    } else if (inauspiciousHexagrams.includes(hexagram.name)) {
        fortune = '此卦提示需要谨慎，可能面临一些挑战。';
        fortuneLevel = '需谨慎';
    } else {
        fortune = '此卦为中平之卦，吉凶参半，关键在于如何应对。';
        fortuneLevel = '中平';
    }
    
    // 构建专业解答
    answer = `<div class="professional-answer">
        <div class="answer-section-item">
            <h4>🎯 卦象总论</h4>
            <p>${hexagram.interpretation}</p>
        </div>
        
        <div class="answer-section-item">
            <h4>📊 运势等级</h4>
            <p><span class="fortune-badge ${fortuneLevel === '吉' ? 'auspicious' : fortuneLevel === '需谨慎' ? 'caution' : 'neutral'}">${fortuneLevel}</span></p>
            <p>${fortune}</p>
        </div>
        
        <div class="answer-section-item">
            <h4>📖 卦辞详解</h4>
            <p><strong>卦名：</strong>${hexagram.name}</p>
            <p><strong>卦义：</strong>${hexagram.meaning}</p>
            <p><strong>建议：</strong>${hexagram.advice}</p>
        </div>`;
    
    // 根据问题类型生成针对性解答
    if (question.includes('事业') || question.includes('工作') || question.includes('职业')) {
        answer += `
        <div class="answer-section-item highlight">
            <h4>💼 事业运势解读</h4>
            <p>关于您的事业问题："${question}"</p>
            <p>${hexagram.name}卦在事业方面的启示：</p>
            <ul>
                <li><strong>当前态势：</strong>${getCareerTrend(hexagram, fortuneLevel)}</li>
                <li><strong>发展机遇：</strong>${getCareerOpportunity(hexagram)}</li>
                <li><strong>注意事项：</strong>${getCareerWarning(hexagram)}</li>
                <li><strong>行动建议：</strong>${getCareerAdvice(hexagram, fortuneLevel)}</li>
            </ul>
        </div>`;
    } else if (question.includes('财运') || question.includes('财富') || question.includes('投资')) {
        answer += `
        <div class="answer-section-item highlight">
            <h4>💰 财运走势解读</h4>
            <p>关于您的财运问题："${question}"</p>
            <p>${hexagram.name}卦在财运方面的启示：</p>
            <ul>
                <li><strong>财运趋势：</strong>${getWealthTrend(hexagram, fortuneLevel)}</li>
                <li><strong>投资机会：</strong>${getWealthOpportunity(hexagram)}</li>
                <li><strong>风险提示：</strong>${getWealthWarning(hexagram)}</li>
                <li><strong>理财建议：</strong>${getWealthAdvice(hexagram, fortuneLevel)}</li>
            </ul>
        </div>`;
    } else if (question.includes('感情') || question.includes('婚姻') || question.includes('恋爱')) {
        answer += `
        <div class="answer-section-item highlight">
            <h4>❤️ 感情婚姻解读</h4>
            <p>关于您的感情问题："${question}"</p>
            <p>${hexagram.name}卦在感情方面的启示：</p>
            <ul>
                <li><strong>感情现状：</strong>${getRelationshipStatus(hexagram, fortuneLevel)}</li>
                <li><strong>缘分机遇：</strong>${getRelationshipOpportunity(hexagram)}</li>
                <li><strong>相处之道：</strong>${getRelationshipAdvice(hexagram)}</li>
                <li><strong>发展前景：</strong>${getRelationshipFuture(hexagram, fortuneLevel)}</li>
            </ul>
        </div>`;
    } else if (question.includes('健康') || question.includes('身体') || question.includes('疾病')) {
        answer += `
        <div class="answer-section-item highlight">
            <h4>🏥 健康养生解读</h4>
            <p>关于您的健康问题："${question}"</p>
            <p>${hexagram.name}卦在健康方面的启示：</p>
            <ul>
                <li><strong>身体状况：</strong>${getHealthStatus(hexagram, fortuneLevel)}</li>
                <li><strong>养生重点：</strong>${getHealthAdvice(hexagram)}</li>
                <li><strong>注意事项：</strong>${getHealthWarning(hexagram)}</li>
            </ul>
        </div>`;
    } else {
        answer += `
        <div class="answer-section-item highlight">
            <h4>🌟 综合运势解读</h4>
            <p>关于您的问题："${question}"</p>
            <p>${hexagram.name}卦的综合启示：</p>
            <ul>
                <li><strong>整体运势：</strong>${getOverallTrend(hexagram, fortuneLevel)}</li>
                <li><strong>关键机遇：</strong>${getKeyOpportunity(hexagram)}</li>
                <li><strong>应对策略：</strong>${getStrategy(hexagram, fortuneLevel)}</li>
            </ul>
        </div>`;
    }
    
    answer += `
        <div class="answer-section-item">
            <h4>💡 六智慧</h4>
            <p>《易经》云："天行健，君子以自强不息。"六爻之道，在于顺应天道，把握时机。${hexagram.name}卦提醒您：${getWisdomQuote(hexagram, fortuneLevel)}</p>
        </div>
    </div>`;
    
    return answer;
}

// 重新问卦
function resetDivination() {
    document.getElementById('questionInput').value = '';
    document.getElementById('questionSection').style.display = 'block';
    document.getElementById('hexagramResult').style.display = 'none';
    currentQuestion = '';
}

// 返回上级页面
function goBack() {
    if (document.referrer) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}

// ========== 专业解读辅助函数 ==========

// 事业趋势
function getCareerTrend(hexagram, level) {
    const trends = {
        '吉': ['正处于上升期，事业运势旺盛', '适合大展拳脚，把握机遇', '有贵人相助，发展前景广阔'],
        '中平': ['处于平稳期，需要稳扎稳打', '宜守不宜攻，积累经验为主', '时机尚未成熟，需耐心等待'],
        '需谨慎': ['面临挑战，需谨慎应对', '不宜冒进，应当稳守', '有小人作祟，需提高警惕']
    };
    const arr = trends[level] || trends['中平'];
    return arr[Math.floor(Math.random() * arr.length)];
}

// 事业机遇
function getCareerOpportunity(hexagram) {
    const opportunities = ['有晋升或跳槽的机会', '适合创业或开展新项目', '会得到领导或长辈的赏识', '有合作发展的良机'];
    return opportunities[Math.floor(Math.random() * opportunities.length)];
}

// 事业注意
function getCareerWarning(hexagram) {
    const warnings = ['切忌骄傲自满，保持谦逊', '不可独断专行，要听取他人意见', '避免与同事发生冲突', '注意工作细节，不可粗心大意'];
    return warnings[Math.floor(Math.random() * warnings.length)];
}

// 事业建议
function getCareerAdvice(hexagram, level) {
    if (level === '吉') return '积极进取，把握机遇，但要保持谦逊';
    if (level === '需谨慎') return '稳扎稳打，谨慎行事，避免冒险';
    return '循序渐进，积累经验，等待时机';
}

// 财运趋势
function getWealthTrend(hexagram, level) {
    const trends = {
        '吉': ['财运旺盛，正财偏财皆有收获', '投资回报丰厚，财运亨通', '财源广进，收入增加'],
        '中平': ['财运平稳，不宜大额投资', '收入稳定，支出也稳定', '需要理性理财，量入为出'],
        '需谨慎': ['财运低迷，不宜投资', '可能有破财之灾，需警惕', '宜守财为主，不可贪多']
    };
    const arr = trends[level] || trends['中平'];
    return arr[Math.floor(Math.random() * arr.length)];
}

// 财富机遇
function getWealthOpportunity(hexagram) {
    const opportunities = ['有新的投资机会', '工作上有加薪可能', '副业收入增加', '理财收益不错'];
    return opportunities[Math.floor(Math.random() * opportunities.length)];
}

// 财富风险
function getWealthWarning(hexagram) {
    const warnings = ['切忌贪心，见好就收', '避免高风险投资', '不可借贷消费', '警惕诈骗陷阱'];
    return warnings[Math.floor(Math.random() * warnings.length)];
}

// 财富建议
function getWealthAdvice(hexagram, level) {
    if (level === '吉') return '适度投资，稳健理财，不可贪多';
    if (level === '需谨慎') return '保守理财，保住本金，不宜冒险';
    return '量入为出，理性消费，积累为主';
}

// 感情现状
function getRelationshipStatus(hexagram, level) {
    const status = {
        '吉': ['感情运势很好，关系融洽', '单身者有望遇到心仪对象', '感情甜蜜，有望更进一步'],
        '中平': ['感情平稳，需要用心经营', '单身者缘分未到，需耐心等待', '关系有些平淡，需要制造浪漫'],
        '需谨慎': ['感情有波折，需要沟通化解', '可能有第三者介入，需警惕', '关系紧张，需要冷静处理']
    };
    const arr = status[level] || status['中平'];
    return arr[Math.floor(Math.random() * arr.length)];
}

// 感情机遇
function getRelationshipOpportunity(hexagram) {
    const opportunities = ['有望遇到真爱', '感情会升温', '有望步入婚姻殿堂', '旧情复燃的可能'];
    return opportunities[Math.floor(Math.random() * opportunities.length)];
}

// 感情建议
function getRelationshipAdvice(hexagram) {
    const advice = ['真诚相待，互相理解', '多沟通，少争吵', '包容对方的缺点', '制造浪漫，增进感情'];
    return advice[Math.floor(Math.random() * advice.length)];
}

// 感情前景
function getRelationshipFuture(hexagram, level) {
    if (level === '吉') return '前景看好，有望修成正果';
    if (level === '需谨慎') return '需要用心经营，化解矛盾';
    return '顺其自然，真诚相待';
}

// 健康状况
function getHealthStatus(hexagram, level) {
    const status = {
        '吉': ['身体状况良好，精力充沛', '免疫力强，不易生病', '精神状态佳'],
        '中平': ['身体状况一般，需要注意保养', '有些小毛病，但不严重', '需要调整作息'],
        '需谨慎': ['身体虚弱，需要调养', '可能有旧疾复发', '需要注意某方面健康']
    };
    const arr = status[level] || status['中平'];
    return arr[Math.floor(Math.random() * arr.length)];
}

// 健康建议
function getHealthAdvice(hexagram) {
    const advice = ['注意饮食规律，不可暴饮暴食', '适当运动，增强体质', '保证充足睡眠', '保持心情愉快'];
    return advice[Math.floor(Math.random() * advice.length)];
}

// 健康注意
function getHealthWarning(hexagram) {
    const warnings = ['避免过度劳累', '注意肠胃健康', '警惕心脑血管疾病', '定期体检'];
    return warnings[Math.floor(Math.random() * warnings.length)];
}

// 整体趋势
function getOverallTrend(hexagram, level) {
    const trends = {
        '吉': ['整体运势向好，诸事顺利', '天时地利人和，大有可为', '运势旺盛，把握机遇'],
        '中平': ['运势平稳，不好不坏', '需要努力才能有所突破', '时机未到，耐心等待'],
        '需谨慎': ['运势低迷，需要谨慎', '面临挑战，稳扎稳打', '韬光养晦，等待转机']
    };
    const arr = trends[level] || trends['中平'];
    return arr[Math.floor(Math.random() * arr.length)];
}

// 关键机遇
function getKeyOpportunity(hexagram) {
    const opportunities = ['有新的机遇出现，需要把握', '人际关系带来好运', '学习成长的机会', '改变现状的契机'];
    return opportunities[Math.floor(Math.random() * opportunities.length)];
}

// 应对策略
function getStrategy(hexagram, level) {
    if (level === '吉') return '积极进取，把握机遇，但要保持谦逊谨慎';
    if (level === '需谨慎') return '稳扎稳打，谨慎行事，不可冒进';
    return '循序渐进，审时度势，灵活应对';
}

// 六爻智慧
function getWisdomQuote(hexagram, level) {
    const quotes = [
        '顺应天道，把握时机，方能成功',
        '阴阳平衡，刚柔并济，是为人之道',
        '知进知退，知存知亡，方为智者',
        '积善之家必有余庆，积恶之家必有余殃',
        '天行健，君子以自强不息；地势坤，君子以厚德载物'
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
}

// ========== AI 智能解卦功能 ==========
let currentHexagram = null;

// AI 解卦 API 地址（自动检测当前环境）
const AI_API_BASE = (function() {
    var host = window.location.hostname;
    // 腾讯云 SCF 或本地环境：使用同源 API
    if (host.includes('tencentcs.com') || host.includes('localhost') || host.includes('127.0.0.1')) {
        return '';
    }
    // GitHub Pages 或其他静态托管：指向腾讯云 SCF 后端（国内可访问）
    return 'https://1436877587-kdjwbq6ikf.ap-guangzhou.tencentscf.com';
})();

// 保存当前卦象信息供 AI 解卦使用
const originalDisplayHexagram = displayHexagram;
displayHexagram = function(hexagram) {
    currentHexagram = hexagram;
    originalDisplayHexagram(hexagram);
};

// 请求 AI 解卦
async function requestAIDivination() {
    const aiResult = document.getElementById('aiResult');
    const button = document.querySelector('.ai-divine-button');

    if (!currentHexagram || !currentQuestion) {
        alert('请先起卦并输入问题');
        return;
    }

    // 显示加载状态
    button.disabled = true;
    button.textContent = '✨ AI 解卦中，请稍候...';
    button.style.opacity = '0.7';
    aiResult.style.display = 'block';
    aiResult.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #fff8eb 0%, #f5ebe0 100%);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid rgba(139, 69, 19, 0.2);
        ">
            <div style="font-size: 24px; margin-bottom: 10px;">🔮</div>
            <p style="color: #6b4423;">AI 大师正在深度解析卦象...</p>
            <div style="
                width: 40px; height: 40px;
                border: 3px solid #8b4513;
                border-top: 3px solid transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 10px auto;
            "></div>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
        const requestBody = {
            question: currentQuestion,
            hexagramName: currentHexagram.name,
            hexagramSymbol: currentHexagram.symbol,
            meaning: currentHexagram.meaning,
            lines: currentHexagram.lines,
            category: currentHexagram.category || '',
            fortune: currentHexagram.fortune || '',
            najia: currentHexagram.najia || null,
            liuqin: currentHexagram.liuqin || [],
            liushen: currentHexagram.liushen || [],
            shiying: currentHexagram.shiying || null
        };

        const response = await fetch(AI_API_BASE + '/api/divine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (result.success) {
            // 打字机效果显示结果
            aiResult.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #fff8eb 0%, #f5ebe0 100%);
                    border: 1px solid rgba(139, 69, 19, 0.3);
                    border-radius: 12px;
                    padding: 25px;
                    box-shadow: 0 4px 15px rgba(139, 69, 19, 0.1);
                ">
                    <h4 style="color: #8b4513; margin-bottom: 15px; font-size: 1.3rem; border-bottom: 2px solid #cd853f; padding-bottom: 10px;">🧠 AI 大师解读</h4>
                    <div id="aiText" style="line-height: 2; color: #3e2723; font-size: 15px; white-space: pre-wrap;"></div>
                </div>
            `;
            typeWriter(document.getElementById('aiText'), result.data.interpretation, 0);
        } else {
            throw new Error(result.error || 'AI 服务异常');
        }

    } catch (error) {
        aiResult.innerHTML = `
            <div style="
                background: #fff5f5;
                border: 1px solid #fed7d7;
                border-radius: 12px;
                padding: 16px;
                color: #8b0000;
            ">
                <p>⚠️ AI 解卦服务暂时不可用</p>
                <p style="font-size: 12px; color: #6b4423; margin-top: 8px;">原因: ${error.message}</p>
                <p style="font-size: 12px; color: #6b4423;">提示: 请确保后端服务已启动且配置了 DASHSCOPE_API_KEY</p>
            </div>
        `;
    } finally {
        button.disabled = false;
        button.textContent = '✨ 重新 AI 解卦';
        button.style.opacity = '1';
    }
}

// 打字机效果
function typeWriter(element, text, index) {
    if (index < text.length) {
        // 处理 Markdown 粗体 **text**
        if (text.charAt(index) === '*' && text.charAt(index + 1) === '*') {
            const endBold = text.indexOf('**', index + 2);
            if (endBold !== -1) {
                const boldText = text.substring(index + 2, endBold);
                element.innerHTML += '<strong style="color:#6b3a1f;">' + boldText + '</strong>';
                setTimeout(() => typeWriter(element, text, endBold + 2), 15);
                return;
            }
        }
        // 处理 Markdown 分隔线 ---
        if (text.charAt(index) === '-' && text.charAt(index + 1) === '-' && text.charAt(index + 2) === '-') {
            const lineEnd = text.indexOf('\n', index);
            const skipTo = lineEnd !== -1 ? lineEnd + 1 : text.length;
            element.innerHTML += '<hr style="border:none;border-top:1px solid #cd853f;margin:15px 0;">';
            setTimeout(() => typeWriter(element, text, skipTo), 15);
            return;
        }
        const char = text.charAt(index);
        if (char === '\n') {
            element.innerHTML += '<br>';
        } else {
            element.innerHTML += char;
        }
        setTimeout(() => typeWriter(element, text, index + 1), 15);
    }
}
