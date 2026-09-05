// ===== 商品详情页渲染（product.html）=====
// 读 URL ?id= → 拉 /api/products → 匹配该商品 → 渲染详情；购买按钮复用 product-common.js 的弹窗

function escDetail(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

// 纯文本按空行分段 → <p>，段内单换行 → <br>
function formatDetail(text) {
    if (!text || !text.trim()) return '';
    return text.split(/\n\s*\n/).map(function (para) {
        var lines = para.split('\n').map(escDetail).join('<br>');
        return '<p>' + lines + '</p>';
    }).join('');
}

function renderProductEmpty(container, text) {
    container.innerHTML =
        '<div class="product-empty">' +
            '<p class="product-empty-text">' + text + '</p>' +
            '<a href="wenchuang.html" class="product-back-btn">← 返回文创雅集</a>' +
        '</div>';
}

function renderProductDetail(container, p) {
    var qr = p.qr_code ? (PRODUCT_API + p.qr_code) : '';
    var image = p.image_url ? (PRODUCT_API + p.image_url) : '';
    var link = p.link || '#';
    var detailHtml = formatDetail(p.detail || '');
    document.title = p.name + ' - 商品详情 - 易道';

    var gallery = image
        ? '<img class="product-img" src="' + image + '" alt="' + escDetail(p.name) + '">'
        : '<div class="product-img-placeholder" style="background:' + escDetail(p.color || 'linear-gradient(135deg,#E8D5B7,#C9A87C)') + '"><span>' + (p.icon || '🎁') + '</span></div>';

    container.innerHTML =
        '<a href="wenchuang.html" class="product-back">← 返回文创雅集</a>' +
        '<div class="product-main">' +
            '<div class="product-gallery">' + gallery + '</div>' +
            '<div class="product-info">' +
                '<h1 class="product-name">' + escDetail(p.name) + '</h1>' +
                (p.series ? '<div class="product-tags"><span class="product-tag">' + escDetail(p.series) + '</span></div>' : '') +
                (p.price ? '<div class="product-price">' + escDetail(p.price) + '</div>' : '') +
                (p.description ? '<p class="product-desc">' + escDetail(p.description) + '</p>' : '') +
                '<a href="' + escDetail(link) + '" class="wenchuang-card-link product-buy" target="_blank" data-qr="' + escDetail(qr) + '" data-name="' + escDetail(p.name) + '" onclick="handleBuyClick(event)">前往购买 →</a>' +
            '</div>' +
        '</div>' +
        (detailHtml ? '<div class="product-detail-text"><h2 class="product-section-title">商品详情</h2>' + detailHtml + '</div>' : '');
}

document.addEventListener('DOMContentLoaded', function () {
    var container = document.getElementById('productDetail');
    if (!container) return;
    var id = new URLSearchParams(window.location.search).get('id');
    if (!id || !PRODUCT_API) { renderProductEmpty(container, '商品不存在或已下架'); return; }
    fetch(PRODUCT_API + '/api/products')
        .then(function (r) { return r.json(); })
        .then(function (result) {
            var prods = (result && result.success && result.data && result.data.products) ? result.data.products : [];
            var p = null;
            for (var i = 0; i < prods.length; i++) { if (String(prods[i].id) === String(id)) { p = prods[i]; break; } }
            if (p) renderProductDetail(container, p); else renderProductEmpty(container, '商品不存在或已下架');
        })
        .catch(function () { renderProductEmpty(container, '加载失败，请稍后重试'); });
});
