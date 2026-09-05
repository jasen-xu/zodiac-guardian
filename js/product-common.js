// ===== 商品模块共享逻辑 =====
// wenchuang.html（商品网格）与 product.html（商品详情）共用：
// PRODUCT_API 地址 + 剪贴板复制 + 微信口令解析 + 购买方式弹窗（扫码 / 口令）

// API 基础地址（HTTPS 直连上海后台 admin.yi-yao.net，绕过 SCF 代理与天御验证码）
// 本地预览：URL 加 ?api=prod 可让 localhost 直连生产后台，查看真实商品数据与图片
var PRODUCT_API = (function () {
    var host = window.location.hostname;
    if (/[?&]api=prod/.test(window.location.search)) return 'https://admin.yi-yao.net';
    if (host === 'yi-yao.net' || host === 'www.yi-yao.net') return 'https://admin.yi-yao.net';
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3001';
    return '';
})();

// 复制文本到剪贴板（HTTPS 用 Clipboard API，降级用 execCommand）
function copyToClipboard(text) {
    return new Promise(function (resolve) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(function () { resolve(true); }, function () { resolve(legacyCopy(text)); });
        } else {
            resolve(legacyCopy(text));
        }
    });
}
function legacyCopy(text) {
    try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (e) { return false; }
}

// 从口令解析店铺名（格式 #微信小店://店铺名/短码）
function parseStoreName(link) {
    var storeName = '微信小店';
    var idx = link.indexOf('://');
    if (idx > -1) {
        var rest = link.substring(idx + 3);
        var slash = rest.indexOf('/');
        if (slash > -1) storeName = rest.substring(0, slash);
    }
    return storeName;
}

// 购买按钮点击处理（网格卡片与详情页共用）
function handleBuyClick(event) {
    var a = event.currentTarget || event.target;
    var link = (a.getAttribute('href') || '').trim();
    var qr = (a.getAttribute('data-qr') || '').trim();
    var name = (a.getAttribute('data-name') || '').trim();
    // 空链接：敬请期待
    if (!link || link === '#') {
        event.preventDefault();
        if (typeof Toast !== 'undefined') Toast.info('购买渠道即将开放，敬请期待'); else alert('购买渠道即将开放，敬请期待');
        return;
    }
    // 普通 http/https 网页链接：新标签直接打开（保持默认行为）
    var lower = link.toLowerCase();
    if (lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0) return;
    // 微信小店/小程序口令：网页无法直接跳转 → 弹窗给“扫码 + 口令”两种方式
    event.preventDefault();
    openBuyModal(link, qr, name);
}

// ===== 购买方式弹窗（微信扫码 + 口令复制）=====
var _buyKouling = '';

// 动态注入弹窗 DOM（两个页面无需各自内联弹窗 HTML）
function injectBuyModal() {
    if (document.getElementById('buyModalMask')) return;
    if (!document.body) return;
    var html =
        '<div class="buy-modal-mask" id="buyModalMask" onclick="if(event.target===this)closeBuyModal()">' +
            '<div class="buy-modal">' +
                '<button class="buy-modal-close" onclick="closeBuyModal()" aria-label="关闭">✕</button>' +
                '<h3 class="buy-modal-title" id="buyModalTitle">前往购买</h3>' +
                '<p class="buy-modal-store">店铺：<span id="buyModalStore">微信小店</span></p>' +
                '<div class="buy-modal-qr-wrap" id="buyModalQrWrap">' +
                    '<img class="buy-modal-qr" id="buyModalQrImg" src="" alt="微信小店二维码">' +
                    '<p class="buy-modal-tip">用微信「扫一扫」，直达小店</p>' +
                '</div>' +
                '<div class="buy-modal-divider" id="buyModalDivider"><span>或</span></div>' +
                '<div class="buy-modal-kouling">' +
                    '<code class="buy-modal-code" id="buyModalCode"></code>' +
                    '<button class="buy-modal-copy" id="buyModalCopy" onclick="copyKoulingFromModal()">复制口令</button>' +
                '</div>' +
                '<p class="buy-modal-tip">复制后打开微信，粘贴到聊天框发送，点链接进店</p>' +
            '</div>' +
        '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

function openBuyModal(link, qr, name) {
    _buyKouling = link;
    injectBuyModal();
    var mask = document.getElementById('buyModalMask');
    // 兜底：仍拿不到弹窗容器时，退回“复制口令 + toast”
    if (!mask) {
        copyToClipboard(link).then(function (ok) {
            var msg = '口令已复制！打开微信→粘贴到聊天框(如文件传输助手)发送→点链接进「' + parseStoreName(link) + '」购买';
            if (typeof Toast === 'undefined') { alert(ok ? msg : ('请手动复制口令：' + link)); return; }
            if (ok) Toast.success(msg, 8000); else Toast.warning('复制失败，请手动复制口令：' + link, 8000);
        });
        return;
    }
    var storeName = parseStoreName(link);
    document.getElementById('buyModalTitle').textContent = name ? ('购买 · ' + name) : '前往购买';
    document.getElementById('buyModalStore').textContent = storeName;
    var qrWrap = document.getElementById('buyModalQrWrap');
    var divider = document.getElementById('buyModalDivider');
    if (qr) {
        document.getElementById('buyModalQrImg').src = qr;
        qrWrap.style.display = '';
        if (divider) divider.style.display = '';
    } else {
        qrWrap.style.display = 'none';
        if (divider) divider.style.display = 'none';
        copyToClipboard(link); // 无二维码时自动复制口令，少一步操作
    }
    document.getElementById('buyModalCode').textContent = link;
    var copyBtn = document.getElementById('buyModalCopy');
    if (copyBtn) copyBtn.textContent = '复制口令';
    mask.classList.add('show');
}
function closeBuyModal() {
    var mask = document.getElementById('buyModalMask');
    if (mask) mask.classList.remove('show');
}
function copyKoulingFromModal() {
    if (!_buyKouling) return;
    copyToClipboard(_buyKouling).then(function (ok) {
        var btn = document.getElementById('buyModalCopy');
        if (btn) {
            btn.textContent = ok ? '✓ 已复制' : '复制失败';
            setTimeout(function () { btn.textContent = '复制口令'; }, 2500);
        }
        if (ok && typeof Toast !== 'undefined') Toast.success('口令已复制，去微信粘贴到聊天框发送', 3000);
    });
}
// 页面加载即注入弹窗容器；ESC 关闭
document.addEventListener('DOMContentLoaded', injectBuyModal);
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBuyModal(); });
