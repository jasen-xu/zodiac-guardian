// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 如果主页有生肖网格，渲染生肖卡片
    const grid = document.getElementById('zodiacGrid');
    if (grid) {
        renderZodiacGrid();
    }

    // 移动端导航菜单
    const navToggle = document.getElementById('navToggle');
    const navMobile = document.getElementById('navMobile');
    if (navToggle && navMobile) {
        navToggle.addEventListener('click', function() {
            navMobile.classList.toggle('active');
        });
        // 点击导航链接后关闭菜单
        navMobile.querySelectorAll('.nav-mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                navMobile.classList.remove('active');
            });
        });
    }

    // 平滑滚动（锚点链接）
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 80; // 导航栏高度
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });

    // 导航栏滚动效果
    const nav = document.querySelector('.top-nav');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                nav.style.background = 'rgba(26, 10, 10, 0.98)';
            } else {
                nav.style.background = 'rgba(26, 10, 10, 0.92)';
            }
        });
    }
});

// 渲染生肖网格
function renderZodiacGrid() {
    const grid = document.getElementById('zodiacGrid');
    if (!grid) return;

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
    card.style.animationDelay = `${index * 0.05}s`;

    card.innerHTML = `
        <div class="zodiac-card-image">
            <div class="placeholder-image">${zodiac.name}</div>
        </div>
        <div class="zodiac-card-content">
            <div class="zodiac-card-name">生肖${zodiac.name}</div>
            <div class="zodiac-card-guardian">${zodiac.guardian}</div>
            <div class="zodiac-card-blessing">${zodiac.blessing}</div>
        </div>
    `;

    return card;
}
