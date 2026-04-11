// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    renderZodiacGrid();
});

// 渲染生肖网格
function renderZodiacGrid() {
    const grid = document.getElementById('zodiacGrid');
    
    zodiacData.forEach((zodiac, index) => {
        const card = createZodiacCard(zodiac, index);
        grid.appendChild(card);
    });
}

// 创建生肖卡片
function createZodiacCard(zodiac, index) {
    const card = document.createElement('a');
    card.href = `guardian.html?id=${zodiac.id}`;
    card.className = 'zodiac-card';
    card.style.animationDelay = `${index * 0.1}s`;
    
    card.innerHTML = `
        <div class="zodiac-card-image">
            <div class="placeholder-image">${zodiac.name}</div>
        </div>
        <div class="zodiac-card-content">
            <div class="zodiac-card-name">生肖${zodiac.name}</div>
            <div class="zodiac-card-guardian">守护神：${zodiac.guardian}</div>
            <div class="zodiac-card-blessing">${zodiac.blessing}</div>
        </div>
    `;
    
    return card;
}
