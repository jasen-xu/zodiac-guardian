/**
 * 认证中间件
 * - API Key 认证：供 SCF 后端调用
 * - Session 认证：供管理后台页面访问
 */
const bcrypt = require('bcryptjs');

// API Key 认证（供 SCF 等外部服务调用）
function apiKeyAuth(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const validKey = process.env.API_KEY;
    
    if (!validKey || apiKey !== validKey) {
        return res.status(401).json({ success: false, error: '无效的 API Key' });
    }
    next();
}

// 管理后台 Session 认证
function adminAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    // API 请求返回 401，页面请求重定向到登录
    if (req.path.startsWith('/admin/api/')) {
        return res.status(401).json({ success: false, error: '未登录' });
    }
    res.redirect('/admin/login');
}

// 登录验证
async function verifyPassword(password) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'yidao2026';
    // 支持明文和 bcrypt 两种格式
    if (adminPassword.startsWith('$2')) {
        return bcrypt.compare(password, adminPassword);
    }
    return password === adminPassword;
}

// 生成密码哈希（用于修改密码时）
async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

module.exports = { apiKeyAuth, adminAuth, verifyPassword, hashPassword };
