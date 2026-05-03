// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    showTodayDate();
    checkDailyFortune();
});

// 显示今日日期
function showTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[today.getDay()];
    
    document.getElementById('fortuneDate').textContent = 
        `${year}年${month}月${day}日 星期${weekDay}`;
}

// 检查今日是否已抽签
function checkDailyFortune() {
    const today = new Date().toDateString();
    const savedFortune = localStorage.getItem('dailyFortune');
    const savedDate = localStorage.getItem('fortuneDate');
    
    // 如果今天已经抽过签,直接显示
    if (savedFortune && savedDate === today) {
        const fortune = JSON.parse(savedFortune);
        showFortuneResult(fortune, false);
    }
}

// 抽签功能
function drawFortune() {
    const button = document.getElementById('drawButton');
    button.disabled = true;
    button.textContent = '抽签中...';
    
    // 添加抽签动画效果
    const content = document.getElementById('fortuneContent');
    content.classList.add('drawing');
    
    // 延迟显示结果(模拟抽签过程)
    setTimeout(() => {
        // 随机选择一个签文
        const randomIndex = Math.floor(Math.random() * fortuneData.length);
        const fortune = fortuneData[randomIndex];
        
        // 保存到localStorage(每天只能抽一次)
        const today = new Date().toDateString();
        localStorage.setItem('dailyFortune', JSON.stringify(fortune));
        localStorage.setItem('fortuneDate', today);
        
        // 显示结果
        content.classList.remove('drawing');
        showFortuneResult(fortune, true);
        
        button.disabled = false;
        button.textContent = '重新抽签';
    }, 1500);
}

// 显示签文结果 - 诗词版
function showFortuneResult(fortune, isNew) {
    const content = document.getElementById('fortuneContent');
    
    // 根据签文等级设置颜色
    let levelColor = '#4CAF50'; // 默认绿色
    if (fortune.level === '上上签') {
        levelColor = '#FF6B6B'; // 红色
    } else if (fortune.level === '下签') {
        levelColor = '#999'; // 灰色
    }
    
    // 将诗词按换行符分割
    const poemLines = fortune.poem.split('\n');
    
    // 将宜忌内容按换行符分割
    const adviceLines = fortune.advice.split('\n');
    const yiContent = adviceLines[0] || '';
    const jiContent = adviceLines[1] || '';
    
    content.innerHTML = `
        <div class="fortune-result ${isNew ? 'show' : ''}">
            <div class="fortune-level" style="color: ${levelColor}">
                ${fortune.level}
            </div>
            
            <div class="fortune-fortune">
                ${fortune.fortune}
            </div>
            
            <div class="poem-container">
                <div class="poem-line">${poemLines[0]}</div>
                <div class="poem-line">${poemLines[1]}</div>
            </div>
            
            <div class="fortune-advice">
                <div class="advice-item">
                    <span class="advice-label">宜</span>
                    <span class="advice-text">${yiContent.replace('宜:', '')}</span>
                </div>
                <div class="advice-item">
                    <span class="advice-label">忌</span>
                    <span class="advice-text">${jiContent.replace('忌:', '')}</span>
                </div>
            </div>
            
            <div class="fortune-blessing">
                ${fortune.blessing}
            </div>
            
            <button class="interpret-button" onclick="showInterpretation()">
                📜 查看签文解读
            </button>
            
            <div class="fortune-share">
                <button class="share-button" onclick="shareFortune()">
                    📤 分享今日运势
                </button>
            </div>
        </div>
    `;
}

// 显示签文解读
function showInterpretation() {
    const fortune = JSON.parse(localStorage.getItem('dailyFortune'));
    if (!fortune) return;
    
    const section = document.getElementById('interpretationSection');
    const content = document.getElementById('interpretationContent');
    
    content.innerHTML = `
        <div class="interpretation-header">
            <h3>📖 签文解读</h3>
        </div>
        <div class="interpretation-text">
            ${fortune.interpretation}
        </div>
    `;
    
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 分享功能
function shareFortune() {
    const fortune = JSON.parse(localStorage.getItem('dailyFortune'));
    if (!fortune) return;
    
    const shareText = `【每日一签】${fortune.level} - ${fortune.fortune}\n${fortune.content}\n${fortune.blessing}\n\n十二生肖守护神`;
    
    if (navigator.share) {
        navigator.share({
            title: '每日一签',
            text: shareText
        }).catch(err => console.log('分享失败:', err));
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(shareText).then(() => {
            alert('运势已复制到剪贴板!');
        }).catch(() => {
            alert('分享功能暂不可用');
        });
    }
}

// 返回上级页面
function goBack() {
    if (document.referrer) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
}
