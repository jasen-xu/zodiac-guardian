// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 移动端导航菜单
    const navToggle = document.getElementById('navToggle');
    const navMobile = document.getElementById('navMobile');
    if (navToggle && navMobile) {
        navToggle.addEventListener('click', function() {
            navMobile.classList.toggle('active');
        });
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
                const offset = 80;
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
                nav.style.background = 'rgba(249, 246, 240, 0.92)';
                nav.style.boxShadow = '0 2px 16px rgba(0,0,0,0.05)';
            } else {
                nav.style.background = 'rgba(249, 246, 240, 0.85)';
                nav.style.boxShadow = 'none';
            }
        });
    }

    // Hero 副标题逐字淡入
    const heroSub = document.getElementById('heroSubtitle');
    if (heroSub) {
        const text = heroSub.getAttribute('data-text') || heroSub.textContent;
        heroSub.innerHTML = '';
        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            span.className = 'hero-char';
            span.textContent = text[i] === ' ' ? '\u00A0' : text[i];
            span.style.animationDelay = (1.2 + i * 0.08) + 's';
            heroSub.appendChild(span);
        }
    }

    // Hero Canvas 水墨粒子动画
    initHeroParticles();
});

// ===== Hero 粒子动画 =====
function initHeroParticles() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles;
    const isMobile = window.innerWidth < 768;
    const COUNT = isMobile ? 18 : 40;

    function resize() {
        const hero = canvas.parentElement;
        W = canvas.width = hero.offsetWidth;
        H = canvas.height = hero.offsetHeight;
    }

    function createParticle() {
        const isGold = Math.random() > 0.55;
        return {
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * (isGold ? 2.5 : 4) + 1,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.2 - 0.08,
            alpha: Math.random() * 0.4 + 0.1,
            color: isGold ? '212,175,55' : '60,40,20',
            life: Math.random() * 400 + 200,
            age: 0
        };
    }

    function init() {
        resize();
        particles = [];
        for (let i = 0; i < COUNT; i++) {
            const p = createParticle();
            p.age = Math.random() * p.life;
            particles.push(p);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.age++;
            const lifeRatio = p.age / p.life;
            const opacity = lifeRatio < 0.2 ? lifeRatio * 5 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;
            const finalAlpha = p.alpha * opacity;
            if (p.age >= p.life || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) {
                particles[i] = createParticle();
                return;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color},${finalAlpha})`;
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener('resize', () => { resize(); });
}
