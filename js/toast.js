/**
 * 易道 Toast 通知系统
 * 轻量级消息提示组件，替代 alert()
 */
const Toast = (function () {
    let container = null;
    const ICONS = {
        success: '✓',
        error: '✕',
        warning: '!',
        info: 'i'
    };
    const COLORS = {
        success: { bg: '#E8F5E9', border: '#4A8C5C', text: '#2E5D3A', icon: '#4A8C5C' },
        error:   { bg: '#FFEBEE', border: '#C41E3A', text: '#8B0000', icon: '#C41E3A' },
        warning: { bg: '#FFF8E1', border: '#D4AF37', text: '#6B4423', icon: '#C4981F' },
        info:    { bg: '#E3F2FD', border: '#5A7CA0', text: '#2C4A6E', icon: '#5A7CA0' }
    };

    function ensureContainer() {
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * 显示 Toast 通知
     * @param {string} message - 消息内容
     * @param {string} type - 类型：success / error / warning / info
     * @param {number} duration - 显示时长（ms）
     */
    function show(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;
        const c = ensureContainer();
        const colors = COLORS[type] || COLORS.info;
        const icon = ICONS[type] || ICONS.info;

        const el = document.createElement('div');
        el.className = 'toast-item toast-' + type;
        el.innerHTML =
            '<div class="toast-icon-wrap" style="background:' + colors.icon + '">' +
                '<span class="toast-icon">' + icon + '</span>' +
            '</div>' +
            '<div class="toast-body">' +
                '<p class="toast-msg">' + message + '</p>' +
            '</div>' +
            '<button class="toast-close" aria-label="关闭">&times;</button>' +
            '<div class="toast-progress" style="background:' + colors.icon + '"></div>';

        c.appendChild(el);

        // Force reflow then add visible class
        el.offsetHeight;
        el.classList.add('toast-visible');

        // Start progress bar
        var progressBar = el.querySelector('.toast-progress');
        progressBar.style.animationDuration = duration + 'ms';

        var timer = setTimeout(function () { dismiss(el); }, duration);

        el.querySelector('.toast-close').addEventListener('click', function () {
            clearTimeout(timer);
            dismiss(el);
        });

        return el;
    }

    function dismiss(el) {
        el.classList.remove('toast-visible');
        el.classList.add('toast-hiding');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 400);
    }

    return {
        show: show,
        success: function (msg, dur) { return show(msg, 'success', dur); },
        error:   function (msg, dur) { return show(msg, 'error', dur); },
        warning: function (msg, dur) { return show(msg, 'warning', dur); },
        info:    function (msg, dur) { return show(msg, 'info', dur); }
    };
})();

// 全局快捷方法（替代 alert）
function showToast(msg, type) {
    Toast.show(msg, type || 'info');
}
