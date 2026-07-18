/**
 * 易道 - 用户登录组件（全局共享）
 * 功能：JWT检测、登录/注册模态框、用户状态显示
 * 引入方式：在 </body> 前添加 <script src="js/user.js"></script>
 */
(function () {
    'use strict';

    // API 基础地址（通过香港 SCF 代理，解决 HTTPS 跨域问题）
    var SCF_HK_URL = 'https://1436877587-1kd9vq3oux.ap-hongkong.tencentscf.com';
    var AUTH_API = (function() {
        var host = window.location.hostname;
        if (host === 'yi-yao.net' || host === 'www.yi-yao.net') return SCF_HK_URL;
        if (host.includes('tcloudbaseapp.com')) return SCF_HK_URL;
        if (host.includes('tencentcs.com')) return '';  // 同源
        if (host.includes('localhost') || host.includes('127.0.0.1')) return '';
        return SCF_HK_URL;
    })();

    // 状态
    var currentUser = null;
    var token = null;

    // ========== 初始化 ==========

    function init() {
        injectStyles();
        injectModal();
        injectNav();
        checkLogin();
    }

    // ========== JWT 检测 ==========

    function checkLogin() {
        token = localStorage.getItem('yidao_token');
        if (!token) {
            renderNavLoggedOut();
            return;
        }
        // 验证 token 有效性
        fetch(AUTH_API + '/api/auth/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(function (r) { return r.json(); })
            .then(function (result) {
                if (result.success && result.data) {
                    currentUser = result.data;
                    renderNavLoggedIn();
                } else {
                    localStorage.removeItem('yidao_token');
                    token = null;
                    renderNavLoggedOut();
                }
            })
            .catch(function () {
                // 网络错误时保持现有状态，不强制登出
                if (token) renderNavLoggedIn();
                else renderNavLoggedOut();
            });
    }

    // ========== 导航栏注入 ==========

    function injectNav() {
        var navInner = document.querySelector('.nav-inner');
        if (!navInner) return;

        // 创建用户区域容器
        var userArea = document.createElement('div');
        userArea.className = 'user-nav-area';
        userArea.id = 'userNavArea';
        userArea.innerHTML = '<button class="user-login-btn" onclick="YiDaoUser.showLogin()">登录</button>';

        // 插入到 nav-inner 末尾（在 nav-toggle 之前）
        var toggle = navInner.querySelector('.nav-toggle');
        if (toggle) {
            navInner.insertBefore(userArea, toggle);
        } else {
            navInner.appendChild(userArea);
        }

        // 移动端菜单也加一个
        var navMobile = document.getElementById('navMobile');
        if (navMobile) {
            var mobileUserArea = document.createElement('div');
            mobileUserArea.className = 'user-mobile-area';
            mobileUserArea.id = 'userMobileArea';
            mobileUserArea.innerHTML = '<button class="user-login-btn mobile" onclick="YiDaoUser.showLogin()">登录</button>';
            navMobile.appendChild(mobileUserArea);
        }
    }

    function renderNavLoggedOut() {
        var area = document.getElementById('userNavArea');
        if (area) {
            area.innerHTML = '<button class="user-login-btn" onclick="YiDaoUser.showLogin()">登录</button>';
        }
        var mobileArea = document.getElementById('userMobileArea');
        if (mobileArea) {
            mobileArea.innerHTML = '<button class="user-login-btn mobile" onclick="YiDaoUser.showLogin()">登录</button>';
        }
    }

    function renderNavLoggedIn() {
        if (!currentUser) return;
        var displayName = currentUser.nickname || ('用户' + (currentUser.phone || '').slice(-4));
        var levelNames = { l0: '游客', l1: '注册', l2: '会员', l3: 'VIP' };
        var levelName = levelNames[currentUser.level] || '';

        var html = ''
            + '<div class="user-dropdown">'
            + '  <button class="user-dropdown-trigger" onclick="YiDaoUser.toggleDropdown()">'
            + '    <span class="user-avatar-small">' + displayName.charAt(0) + '</span>'
            + '    <span class="user-display-name">' + escHtml(displayName) + '</span>'
            + '    <span class="user-level-tag">' + levelName + '</span>'
            + '  </button>'
            + '  <div class="user-dropdown-menu" id="userDropdownMenu">'
            + '    <div class="user-dropdown-info">手机号：' + maskPhone(currentUser.phone) + '</div>'
            + '    <button class="user-dropdown-item" onclick="YiDaoUser.showUsage()">我的额度</button>'
            + '    <button class="user-dropdown-item logout" onclick="YiDaoUser.logout()">退出登录</button>'
            + '  </div>'
            + '</div>';

        var area = document.getElementById('userNavArea');
        if (area) area.innerHTML = html;

        var mobileArea = document.getElementById('userMobileArea');
        if (mobileArea) {
            mobileArea.innerHTML = ''
                + '<div class="user-mobile-logged">'
                + '  <span class="user-display-name">' + escHtml(displayName) + ' (' + levelName + ')</span>'
                + '  <button class="user-dropdown-item logout" onclick="YiDaoUser.logout()">退出登录</button>'
                + '</div>';
        }
    }

    // ========== 模态框注入 ==========

    function injectModal() {
        var modal = document.createElement('div');
        modal.id = 'yidaoLoginModal';
        modal.className = 'yidao-login-modal';
        modal.innerHTML = ''
            + '<div class="yidao-login-overlay" onclick="YiDaoUser.hideLogin()"></div>'
            + '<div class="yidao-login-box">'
            + '  <button class="yidao-login-close" onclick="YiDaoUser.hideLogin()">&times;</button>'
            + '  <div class="yidao-login-header">'
            + '    <h2 class="yidao-login-title">登录 / 注册</h2>'
            + '    <p class="yidao-login-subtitle">手机号验证登录，未注册的手机号将自动创建账号</p>'
            + '  </div>'
            + '  <div class="yidao-login-form">'
            + '    <div class="yidao-form-group">'
            + '      <label class="yidao-form-label">手机号</label>'
            + '      <input class="yidao-form-input" id="yidaoPhoneInput" type="tel" maxlength="11" placeholder="请输入手机号" autocomplete="tel">'
            + '    </div>'
            + '    <div class="yidao-form-group">'
            + '      <label class="yidao-form-label">验证码</label>'
            + '      <div class="yidao-code-row">'
            + '        <input class="yidao-form-input code" id="yidaoCodeInput" type="text" maxlength="6" placeholder="6位验证码" autocomplete="one-time-code">'
            + '        <button class="yidao-code-btn" id="yidaoCodeBtn" onclick="YiDaoUser.sendCode()">获取验证码</button>'
            + '      </div>'
            + '    </div>'
            + '    <button class="yidao-login-submit" id="yidaoLoginBtn" onclick="YiDaoUser.doLogin()">登录</button>'
            + '    <p class="yidao-login-tips">登录即表示同意<span class="yidao-link" onclick="YiDaoUser.showTerms()">服务条款</span></p>'
            + '  </div>'
            + '  <div class="yidao-login-message" id="yidaoLoginMsg"></div>'
            + '</div>';
        document.body.appendChild(modal);

        // 回车提交
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && modal.classList.contains('show')) {
                YiDaoUser.doLogin();
            }
        });
    }

    // ========== 发送验证码 ==========

    var codeCooldown = 0;
    var codeTimer = null;

    function sendCode() {
        var phone = document.getElementById('yidaoPhoneInput').value.trim();
        if (!/^1\d{10}$/.test(phone)) {
            showMsg('请输入正确的11位手机号', 'error');
            return;
        }
        if (codeCooldown > 0) return;

        var btn = document.getElementById('yidaoCodeBtn');
        btn.disabled = true;
        showMsg('正在发送验证码...', 'info');

        fetch(AUTH_API + '/api/auth/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone })
        })
            .then(function (r) { return r.json(); })
            .then(function (result) {
                if (result.success) {
                    showMsg('验证码已发送，请查看短信', 'success');
                    startCooldown(60);
                } else {
                    showMsg(result.error || '发送失败', 'error');
                    btn.disabled = false;
                }
            })
            .catch(function (e) {
                showMsg('网络错误，请稍后重试', 'error');
                btn.disabled = false;
            });
    }

    function startCooldown(seconds) {
        codeCooldown = seconds;
        var btn = document.getElementById('yidaoCodeBtn');
        var timer = setInterval(function () {
            codeCooldown--;
            btn.textContent = codeCooldown + 's';
            if (codeCooldown <= 0) {
                clearInterval(timer);
                btn.textContent = '获取验证码';
                btn.disabled = false;
            }
        }, 1000);
    }

    // ========== 登录 ==========

    function doLogin() {
        var phone = document.getElementById('yidaoPhoneInput').value.trim();
        var code = document.getElementById('yidaoCodeInput').value.trim();

        if (!/^1\d{10}$/.test(phone)) {
            showMsg('请输入正确的11位手机号', 'error');
            return;
        }
        if (!/^\d{6}$/.test(code)) {
            showMsg('请输入6位数字验证码', 'error');
            return;
        }

        var btn = document.getElementById('yidaoLoginBtn');
        btn.disabled = true;
        btn.textContent = '登录中...';
        showMsg('', '');

        fetch(AUTH_API + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phone, code: code })
        })
            .then(function (r) { return r.json(); })
            .then(function (result) {
                if (result.success && result.data) {
                    token = result.data.token;
                    currentUser = result.data.user;
                    localStorage.setItem('yidao_token', token);
                    showMsg('登录成功！', 'success');
                    setTimeout(function () {
                        hideLogin();
                        renderNavLoggedIn();
                        // 触发自定义事件，其他模块可监听
                        window.dispatchEvent(new CustomEvent('yidao-login', { detail: currentUser }));
                    }, 500);
                } else {
                    showMsg(result.error || '登录失败', 'error');
                }
                btn.disabled = false;
                btn.textContent = '登录';
            })
            .catch(function (e) {
                showMsg('网络错误，请稍后重试', 'error');
                btn.disabled = false;
                btn.textContent = '登录';
            });
    }

    // ========== 退出 ==========

    function logout() {
        token = null;
        currentUser = null;
        localStorage.removeItem('yidao_token');
        renderNavLoggedOut();
        closeDropdown();
        window.dispatchEvent(new CustomEvent('yidao-logout'));
    }

    // ========== 额度查询弹窗 ==========

    function showUsage() {
        closeDropdown();
        if (!token) { showLogin(); return; }

        fetch(AUTH_API + '/api/user/usage', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
            .then(function (r) { return r.json(); })
            .then(function (result) {
                if (result.success && result.data) {
                    var d = result.data;
                    var levelNames = { l0: '游客', l1: '注册用户', l2: '会员', l3: 'VIP' };
                    var periodNames = { l0: '每日', l1: '每月', l2: '每月', l3: '每月' };
                    var period = periodNames[d.level] || '每月';

                    var msg = '【' + (levelNames[d.level] || d.level) + '】\n\n'
                        + '🔮 解卦：' + formatQuota(d.divine, period) + '\n'
                        + '🏛 八字：' + formatQuota(d.bazi, period);

                    if (typeof Toast !== 'undefined') {
                        Toast.info(msg.replace(/\n/g, '<br>'), 5000);
                    } else {
                        alert(msg);
                    }
                }
            })
            .catch(function () { });
    }

    function formatQuota(info, period) {
        if (info.limit === -1) return '无限次';
        if (info.limit === 0) return '暂未开放';
        return period + ' ' + info.remaining + '/' + info.limit + ' 次';
    }

    // ========== 模态框控制 ==========

    function showLogin() {
        document.getElementById('yidaoLoginModal').classList.add('show');
        document.getElementById('yidaoPhoneInput').focus();
        showMsg('', '');
    }

    function hideLogin() {
        document.getElementById('yidaoLoginModal').classList.remove('show');
    }

    function showMsg(text, type) {
        var el = document.getElementById('yidaoLoginMsg');
        el.textContent = text;
        el.className = 'yidao-login-message' + (type ? ' ' + type : '');
    }

    // ========== 下拉菜单 ==========

    function toggleDropdown() {
        var menu = document.getElementById('userDropdownMenu');
        if (menu) menu.classList.toggle('show');
    }

    function closeDropdown() {
        var menu = document.getElementById('userDropdownMenu');
        if (menu) menu.classList.remove('show');
    }

    // 点击外部关闭下拉
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.user-dropdown')) {
            closeDropdown();
        }
    });

    // ========== 服务条款 ==========

    function showTerms() {
        alert('易道服务条款\n\n1. 本服务仅供传统文化学习与娱乐参考\n2. 所有解读内容不构成任何决策建议\n3. 请妥善保管您的账号信息\n4. 我们尊重并保护您的个人隐私');
    }

    // ========== 工具函数 ==========

    function escHtml(s) {
        if (!s) return '';
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function maskPhone(phone) {
        if (!phone || phone.length < 7) return phone || '';
        return phone.substring(0, 3) + '****' + phone.substring(7);
    }

    // ========== 注入样式 ==========

    function injectStyles() {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'css/user.css';
        document.head.appendChild(link);
    }

    // ========== 公开 API ==========

    window.YiDaoUser = {
        showLogin: showLogin,
        hideLogin: hideLogin,
        sendCode: sendCode,
        doLogin: doLogin,
        logout: logout,
        toggleDropdown: toggleDropdown,
        showUsage: showUsage,
        showTerms: showTerms,
        getUser: function () { return currentUser; },
        getToken: function () { return token; },
        isLoggedIn: function () { return !!currentUser; }
    };

    // DOM 就绪后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
