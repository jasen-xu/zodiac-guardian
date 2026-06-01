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
                nav.style.background = 'rgba(249, 246, 240, 0.99)';
                nav.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
            } else {
                nav.style.background = 'rgba(249, 246, 240, 0.96)';
                nav.style.boxShadow = 'none';
            }
        });
    }
});
