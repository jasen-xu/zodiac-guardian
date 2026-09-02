// 文创产品数据
const wenchuangData = [
    // === 灵犀珠系列 ===
    {
        id: "buddha-pendant",
        name: "本命佛纯银挂件",
        series: "灵犀珠系列",
        category: "prayer",
        desc: "十二生肖守护佛，999纯银铸造，精工细作",
        price: "¥298 - ¥598",
        icon: "🙏",
        color: "linear-gradient(135deg, #E8D5B7, #C9A87C)",
        link: "#"
    },
    {
        id: "peace-buckle",
        name: "和田玉平安扣",
        series: "灵犀珠系列",
        category: "prayer",
        desc: "天然和田玉，温润细腻，寓意平安吉祥",
        price: "¥388 - ¥1280",
        icon: "🪷",
        color: "linear-gradient(135deg, #D4E6D4, #A8C8A8)",
        link: "#"
    },
    {
        id: "blessing-bracelet",
        name: "檀木手串",
        series: "灵犀珠系列",
        category: "prayer",
        desc: "小叶紫檀108颗佛珠，匠心手作",
        price: "¥168 - ¥680",
        icon: "📿",
        color: "linear-gradient(135deg, #8B6B4A, #5C4033)",
        link: "#"
    },
    {
        id: "amulet-bag",
        name: "手工刺绣护身符",
        series: "灵犀珠系列",
        category: "prayer",
        desc: "苏绣锦囊符袋，内置传统平安符",
        price: "¥128 - ¥298",
        icon: "🧧",
        color: "linear-gradient(135deg, #E8B4B4, #BC2C24)",
        link: "#"
    },

    // === 墨韵系列 ===
    {
        id: "calligraphy-scroll",
        name: "手书心经摆件",
        series: "墨韵系列",
        category: "art",
        desc: "名家手写般若心经，宣纸装裱，紫檀木框",
        price: "¥580 - ¥1680",
        icon: "📜",
        color: "linear-gradient(135deg, #F5EDE0, #DCD2C0)",
        link: "#"
    },
    {
        id: "ink-painting",
        name: "水墨山水小品",
        series: "墨韵系列",
        category: "art",
        desc: "原创水墨山水画，适合书房茶室悬挂",
        price: "¥880 - ¥3600",
        icon: "🎨",
        color: "linear-gradient(135deg, #C8D8C8, #8FA88F)",
        link: "#"
    },
    {
        id: "tea-set",
        name: "禅意建盏茶杯",
        series: "墨韵系列",
        category: "art",
        desc: "非遗传承人手作建盏，天目釉色变幻",
        price: "¥268 - ¥1200",
        icon: "🍵",
        color: "linear-gradient(135deg, #B8A88A, #8B7355)",
        link: "#"
    },
    {
        id: "incense-set",
        name: "沉香线香礼盒",
        series: "墨韵系列",
        category: "art",
        desc: "天然越南沉香，配铜香插，静心品茗",
        price: "¥198 - ¥580",
        icon: "🪔",
        color: "linear-gradient(135deg, #D4C4A8, #A89070)",
        link: "#"
    },

    // === 空间文化系列 ===
    {
        id: "pixiu-ornament",
        name: "纯铜貔貅摆件",
        series: "空间文化系列",
        category: "space",
        desc: "精铸黄铜貔貅，传统吉祥寓意",
        price: "¥368 - ¥1580",
        icon: "🐉",
        color: "linear-gradient(135deg, #D4AF37, #8B7020)",
        link: "#"
    },
    {
        id: "compass",
        name: "精铜罗盘",
        series: "空间文化系列",
        category: "space",
        desc: "三合罗盘，纯铜铸造，传统文化雅器",
        price: "¥480 - ¥2680",
        icon: "🧭",
        color: "linear-gradient(135deg, #C9A87C, #8B6914)",
        link: "#"
    },
    {
        id: "five-coins",
        name: "五帝钱",
        series: "空间文化系列",
        category: "space",
        desc: "真品五帝铜钱，传统民俗文化寓意",
        price: "¥168 - ¥398",
        icon: "🪙",
        color: "linear-gradient(135deg, #D4C090, #A89060)",
        link: "#"
    },
    {
        id: "wenchang-tower",
        name: "铜质文昌塔",
        series: "空间文化系列",
        category: "space",
        desc: "九层文昌塔，利学业考试，功名仕途",
        price: "¥298 - ¥880",
        icon: "🗼",
        color: "linear-gradient(135deg, #C8B888, #9A8858)",
        link: "#"
    }
];

// API 基础地址（经 SCF 代理，与 user.js 同逻辑；本地联调直连后台 3001）
var PRODUCT_API = (function () {
    var host = window.location.hostname;
    if (host === 'yi-yao.net' || host === 'www.yi-yao.net') return 'https://1436877587-1kd9vq3oux.ap-hongkong.tencentscf.com';
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3001';
    return '';
})();

// 从管理后台加载商品（成功则替换静态数据，失败回退静态数据）
function loadRemoteProducts(callback) {
    if (!PRODUCT_API) return callback(false);
    fetch(PRODUCT_API + '/api/products')
        .then(function (r) { return r.json(); })
        .then(function (result) {
            if (result.success && result.data && result.data.products && result.data.products.length > 0) {
                var remote = result.data.products.map(function (p) {
                    return {
                        id: p.id,
                        name: p.name,
                        series: p.series,
                        category: p.category,
                        desc: p.description || '',
                        price: p.price || '',
                        icon: p.icon || '🎁',
                        color: p.color || 'linear-gradient(135deg, #E8D5B7, #C9A87C)',
                        link: p.link || '#',
                        image: p.image_url ? (PRODUCT_API + p.image_url) : ''
                    };
                });
                wenchuangData.length = 0;
                Array.prototype.push.apply(wenchuangData, remote);
                callback(true);
            } else {
                callback(false);
            }
        })
        .catch(function () { callback(false); });
}

// 页面加载完成后渲染产品（优先后台数据，失败回退静态数据）
document.addEventListener('DOMContentLoaded', function() {
    loadRemoteProducts(function () {
        renderProducts('all');
    });
});

// 渲染产品
function renderProducts(category) {
    const grid = document.getElementById('wenchuangGrid');
    const filtered = category === 'all' 
        ? wenchuangData 
        : wenchuangData.filter(p => p.category === category);

    grid.innerHTML = filtered.map((product, index) => `
        <div class="wenchuang-card" style="animation-delay: ${index * 0.06}s">
            <div class="wenchuang-card-image" style="background: ${product.color}">
                <span class="card-series-tag">${product.series}</span>
                ${product.image
                    ? `<img src="${product.image}" alt="${product.name}" loading="lazy">`
                    : `<span>${product.icon}</span>`}
            </div>
            <div class="wenchuang-card-body">
                <h3 class="wenchuang-card-name">${product.name}</h3>
                <p class="wenchuang-card-desc">${product.desc}</p>
                <div class="wenchuang-card-price">${product.price}</div>
                <a href="${product.link}" class="wenchuang-card-link" target="_blank" onclick="handleBuyClick(event)">前往购买 →</a>
            </div>
        </div>
    `).join('');
}

// 筛选产品
function filterProducts(category, btn) {
    // 更新按钮状态
    document.querySelectorAll('.wenchuang-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // 渲染筛选后的产品
    renderProducts(category);
}

// 购买按钮点击处理
function handleBuyClick(event) {
    const link = event.target.getAttribute('href');
    if (link === '#') {
        event.preventDefault();
        if (typeof Toast !== 'undefined') Toast.info('购买渠道即将开放，敬请期待'); else alert('购买渠道即将开放，敬请期待');
    }
}
