/**
 * JWT 认证中间件
 * 用于前端用户 API（非管理后台）
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yidao-jwt-secret-key';

/**
 * 必须登录中间件
 */
function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ success: false, error: '请先登录' });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }
}

/**
 * 可选登录中间件（有 token 就解析，没有也放行）
 */
function optionalAuth(req, res, next) {
    const token = extractToken(req);
    if (token) {
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            // token 无效，忽略
        }
    }
    next();
}

/**
 * 签发 JWT
 */
function signToken(user) {
    return jwt.sign(
        { id: user.id, phone: user.phone, level: user.level, nickname: user.nickname },
        JWT_SECRET,
        { expiresIn: '30d' }
    );
}

/**
 * 从请求中提取 token
 */
function extractToken(req) {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
    if (req.query && req.query.token) return req.query.token;
    return null;
}

module.exports = { requireAuth, optionalAuth, signToken, JWT_SECRET };
