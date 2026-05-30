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

// 分享功能 - 生成日签图片
let currentCardBlob = null;

function shareFortune() {
    const fortune = JSON.parse(localStorage.getItem('dailyFortune'));
    if (!fortune) return;
    
    // 生成日签图片
    generateFortuneCard(fortune).then(blob => {
        currentCardBlob = blob;
        const imageUrl = URL.createObjectURL(blob);
        showShareModal(imageUrl);
    });
}

/**
 * Canvas 绘制精美日签卡片
 */
async function generateFortuneCard(fortune) {
    const canvas = document.createElement('canvas');
    const W = 750, H = 1200;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    
    // === 背景 ===
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#F7EDE2');
    bgGrad.addColorStop(0.5, '#F0E0D0');
    bgGrad.addColorStop(1, '#E8D5C0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
    
    // 添加宣纸纹理效果（细密噪点）
    for (let i = 0; i < 3000; i++) {
        ctx.fillStyle = `rgba(139, 109, 80, ${Math.random() * 0.04})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }
    
    // === 顶部装饰 ===
    ctx.strokeStyle = '#C9A87C';
    ctx.lineWidth = 1.5;
    // 上边双线
    ctx.beginPath();
    ctx.moveTo(60, 50);
    ctx.lineTo(W - 60, 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(60, 55);
    ctx.lineTo(W - 60, 55);
    ctx.stroke();
    
    // 角落装饰
    drawCornerDecor(ctx, 60, 50, 1, 1);
    drawCornerDecor(ctx, W - 60, 50, -1, 1);
    drawCornerDecor(ctx, 60, H - 50, 1, -1);
    drawCornerDecor(ctx, W - 60, H - 50, -1, -1);
    
    // 下边双线
    ctx.beginPath();
    ctx.moveTo(60, H - 50);
    ctx.lineTo(W - 60, H - 50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(60, H - 55);
    ctx.lineTo(W - 60, H - 55);
    ctx.stroke();
    
    let y = 100;
    
    // === 标题 ===
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8B6914';
    ctx.font = 'bold 22px "STKaiti", "KaiTi", "楷体", serif';
    ctx.fillText('— 每 日 一 签 —', W / 2, y);
    y += 50;
    
    // === 日期 ===
    const today = new Date();
    const dateStr = formatDateCN(today);
    ctx.fillStyle = '#A0855C';
    ctx.font = '20px "STKaiti", "KaiTi", "楷体", serif';
    ctx.fillText(dateStr, W / 2, y);
    y += 60;
    
    // === 签文等级 ===
    let levelColor = '#4A8C5C'; // 中签绿色
    if (fortune.level === '上上签') levelColor = '#C41E3A';
    else if (fortune.level === '上签') levelColor = '#D4760A';
    else if (fortune.level === '下签') levelColor = '#888888';
    
    // 等级大字
    ctx.fillStyle = levelColor;
    ctx.font = 'bold 56px "STKaiti", "KaiTi", "楷体", serif';
    ctx.fillText(fortune.level, W / 2, y);
    y += 55;
    
    // === 运势关键词 ===
    ctx.fillStyle = '#5C4033';
    ctx.font = '32px "STKaiti", "KaiTi", "楷体", serif';
    ctx.fillText(fortune.fortune, W / 2, y);
    y += 60;
    
    // === 分隔装饰 ===
    drawDivider(ctx, W / 2, y);
    y += 40;
    
    // === 诗词区 ===
    const poemLines = fortune.poem.split('\n').filter(l => l.trim());
    
    // 引号装饰
    ctx.fillStyle = '#C9A87C';
    ctx.font = '60px "STKaiti", "KaiTi", serif';
    ctx.fillText('"', 110, y - 5);
    
    ctx.fillStyle = '#3C2415';
    ctx.font = '28px "STKaiti", "KaiTi", "楷体", serif';
    poemLines.forEach((line, i) => {
        ctx.fillText(line.trim(), W / 2, y + i * 48);
    });
    
    ctx.fillStyle = '#C9A87C';
    ctx.font = '60px "STKaiti", "KaiTi", serif';
    ctx.fillText('"', W - 110, y + poemLines.length * 48 - 20);
    y += poemLines.length * 48 + 40;
    
    // === 分隔装饰 ===
    drawDivider(ctx, W / 2, y);
    y += 50;
    
    // === 宜忌区 ===
    const adviceLines = fortune.advice.split('\n');
    const yiText = (adviceLines[0] || '').replace('宜:', '').replace('宜：', '').trim();
    const jiText = (adviceLines[1] || '').replace('忌:', '').replace('忌：', '').trim();
    
    const boxW = 280, boxH = 90, gap = 20;
    const yiX = W / 2 - boxW - gap / 2;
    const jiX = W / 2 + gap / 2;
    
    // 宜
    drawAdviceBox(ctx, yiX, y, boxW, boxH, '宜', yiText, '#4A8C5C', '#E8F5E9');
    // 忌
    drawAdviceBox(ctx, jiX, y, boxW, boxH, '忌', jiText, '#C41E3A', '#FFEBEE');
    y += boxH + 50;
    
    // === 祝福语 ===
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8B6914';
    ctx.font = '24px "STKaiti", "KaiTi", "楷体", serif';
    const blessingParts = fortune.blessing.split(',');
    ctx.fillText(blessingParts.join('  ·  '), W / 2, y);
    y += 60;
    
    // === 底部署名 ===
    ctx.fillStyle = '#C9A87C';
    ctx.font = '18px "STKaiti", "KaiTi", "楷体", serif';
    ctx.fillText('生肖守护神', W / 2, H - 80);
    
    // 小图标
    ctx.font = '24px serif';
    ctx.fillText('🏮', W / 2, H - 110);
    
    // 转为 Blob
    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png');
    });
}

// === 辅助绘图函数 ===

function drawCornerDecor(ctx, x, y, dx, dy) {
    ctx.strokeStyle = '#C9A87C';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 15);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 15, y);
    ctx.stroke();
}

function drawDivider(ctx, cx, y) {
    ctx.strokeStyle = '#C9A87C';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 100, y);
    ctx.lineTo(cx - 15, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 15, y);
    ctx.lineTo(cx + 100, y);
    ctx.stroke();
    // 中间菱形
    ctx.fillStyle = '#C9A87C';
    ctx.beginPath();
    ctx.moveTo(cx, y - 6);
    ctx.lineTo(cx + 6, y);
    ctx.lineTo(cx, y + 6);
    ctx.lineTo(cx - 6, y);
    ctx.closePath();
    ctx.fill();
}

function drawAdviceBox(ctx, x, y, w, h, label, text, labelColor, bgColor) {
    // 背景圆角矩形
    ctx.fillStyle = bgColor;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = labelColor + '40';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    
    // 标签圆
    ctx.fillStyle = labelColor;
    ctx.beginPath();
    ctx.arc(x + 38, y + h / 2, 22, 0, Math.PI * 2);
    ctx.fill();
    
    // 标签字
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "STKaiti", "KaiTi", "楷体", serif';
    ctx.fillText(label, x + 38, y + h / 2 + 8);
    
    // 内容文字
    ctx.fillStyle = '#3C2415';
    ctx.textAlign = 'left';
    ctx.font = '20px "STKaiti", "KaiTi", "楷体", serif';
    // 截断过长文字
    const maxTextW = w - 80;
    let displayText = text;
    while (ctx.measureText(displayText).width > maxTextW && displayText.length > 1) {
        displayText = displayText.slice(0, -1);
    }
    ctx.fillText(displayText, x + 70, y + h / 2 + 7);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function formatDateCN(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[date.getDay()];
    return `${year}年${month}月${day}日  星期${weekDay}`;
}

/**
 * 显示分享弹窗
 */
function showShareModal(imageUrl) {
    const modal = document.getElementById('shareModal');
    const img = document.getElementById('shareCardImage');
    img.src = imageUrl;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

/**
 * 关闭分享弹窗
 */
function closeShareModal() {
    const modal = document.getElementById('shareModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

/**
 * 保存日签图片
 */
function downloadCard() {
    if (!currentCardBlob) return;
    const url = URL.createObjectURL(currentCardBlob);
    const a = document.createElement('a');
    const today = new Date();
    a.href = url;
    a.download = `每日一签_${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 原生分享图片
 */
async function shareCardNative() {
    if (!currentCardBlob) return;
    
    const file = new File([currentCardBlob], 'fortune-card.png', { type: 'image/png' });
    
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: '每日一签',
                text: '今日运势分享',
                files: [file]
            });
        } catch (err) {
            console.log('分享取消或失败:', err);
        }
    } else if (navigator.share) {
        // 不支持图片分享时，降级为文字分享
        const fortune = JSON.parse(localStorage.getItem('dailyFortune'));
        if (fortune) {
            const shareText = `【每日一签】${fortune.level} - ${fortune.fortune}\n${fortune.poem}\n${fortune.blessing}`;
            try {
                await navigator.share({ title: '每日一签', text: shareText });
            } catch (err) {
                console.log('分享取消:', err);
            }
        }
    } else {
        // 不支持分享，引导保存图片
        alert('当前浏览器不支持分享功能，请长按图片保存后分享');
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
