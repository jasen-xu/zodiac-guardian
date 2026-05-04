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
        lineDiv.innerHTML = `
            <span class="line-position">第${i + 1}爻</span>
            <span class="line-symbol">${hexagram.lines[i] === '阳' ? '━━━' : '━ ━'}</span>
            <span class="line-type">${hexagram.lines[i]}</span>
        `;
        linesContainer.appendChild(lineDiv);
    }
    
    // 显示卦象解读
    document.getElementById('interpContent').innerHTML = `
        <p>${hexagram.interpretation}</p>
        <p><strong>建议：</strong>${hexagram.advice}</p>
    `;
    
    // 生成综合解答
    const answer = generateAnswer(hexagram, currentQuestion);
    document.getElementById('answerContent').innerHTML = `<p>${answer}</p>`;
}

// 生成综合解答
function generateAnswer(hexagram, question) {
    let answer = '';
    
    // 根据卦象吉凶判断
    const auspiciousHexagrams = ['乾为天', '坤为地', '地天泰', '天火同人', '火天大有', '地山谦', '雷地豫', '天雷无妄', '山天大畜', '火地晋', '风火家人', '风雷益', '地风升', '泽火革', '火风鼎', '雷火丰', '水火既济'];
    const neutralHexagrams = ['水雷屯', '山水蒙', '水天需', '地水师', '水地比', '风天小畜', '天泽履', '泽雷随', '地泽临', '风地观', '山火贲', '地雷复', '山雷颐', '泽风大过', '坎为水', '离为火', '泽山咸', '雷风恒', '雷天大壮', '天山遁', '火泽睽', '水山蹇', '雷水解', '山泽损', '泽天夬', '天风姤', '泽地萃', '火水未济'];
    const inauspiciousHexagrams = ['天水讼', '天地否', '山地剥', '地火明夷', '水风井', '泽水困', '风山渐', '雷泽归妹', '火山旅', '巽为风', '兑为泽', '风水涣', '水泽节', '风泽中孚', '雷山小过'];
    
    let fortune = '';
    if (auspiciousHexagrams.includes(hexagram.name)) {
        fortune = '此卦为吉卦，预示着好的发展趋势。';
    } else if (inauspiciousHexagrams.includes(hexagram.name)) {
        fortune = '此卦提示需要谨慎，可能面临一些挑战。';
    } else {
        fortune = '此卦为中平之卦，吉凶参半，关键在于如何应对。';
    }
    
    // 根据问题类型生成解答
    if (question.includes('事业') || question.includes('工作') || question.includes('职业')) {
        answer = `关于您的事业问题："${question}"\n\n${fortune}\n\n${hexagram.name}卦显示：${hexagram.meaning}。${hexagram.interpretation}\n\n建议：${hexagram.advice}\n\n综合来看，您的事业${auspiciousHexagrams.includes(hexagram.name) ? '前景看好，可以积极进取' : inauspiciousHexagrams.includes(hexagram.name) ? '需要谨慎行事，稳扎稳打' : '需要审时度势，灵活应对'}。保持积极心态，努力进取，必有收获。`;
    } else if (question.includes('财运') || question.includes('财富') || question.includes('投资')) {
        answer = `关于您的财运问题："${question}"\n\n${fortune}\n\n${hexagram.name}卦显示：${hexagram.meaning}。${hexagram.interpretation}\n\n建议：${hexagram.advice}\n\n综合来看，您的财运${auspiciousHexagrams.includes(hexagram.name) ? '较好，可以有适度投资' : inauspiciousHexagrams.includes(hexagram.name) ? '需要保守理财，不宜冒险' : '平稳，稳健为上'}。理财要理性，不可贪多。`;
    } else if (question.includes('感情') || question.includes('婚姻') || question.includes('恋爱')) {
        answer = `关于您的感情问题："${question}"\n\n${fortune}\n\n${hexagram.name}卦显示：${hexagram.meaning}。${hexagram.interpretation}\n\n建议：${hexagram.advice}\n\n综合来看，您的感情${auspiciousHexagrams.includes(hexagram.name) ? '运势很好，有望收获真爱' : inauspiciousHexagrams.includes(hexagram.name) ? '需要用心经营，多沟通理解' : '需要真诚相待，顺其自然'}。真心相待，必有良缘。`;
    } else if (question.includes('健康') || question.includes('身体') || question.includes('疾病')) {
        answer = `关于您的健康问题："${question}"\n\n${fortune}\n\n${hexagram.name}卦显示：${hexagram.meaning}。${hexagram.interpretation}\n\n建议：${hexagram.advice}\n\n综合来看，您的健康状况${auspiciousHexagrams.includes(hexagram.name) ? '良好，保持健康生活方式' : inauspiciousHexagrams.includes(hexagram.name) ? '需要注意保养，及时就医' : '总体平稳，注意养生'}。健康第一，预防为主。`;
    } else {
        answer = `关于您的问题："${question}"\n\n${fortune}\n\n${hexagram.name}卦显示：${hexagram.meaning}。${hexagram.interpretation}\n\n建议：${hexagram.advice}\n\n综合来看，${auspiciousHexagrams.includes(hexagram.name) ? '整体运势向好，可以积极进取' : inauspiciousHexagrams.includes(hexagram.name) ? '需要谨慎应对，稳扎稳打' : '需要审时度势，灵活变通'}。保持积极心态，顺应天道，必有所成。`;
    }
    
    return answer.replace(/\n/g, '<br>');
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
