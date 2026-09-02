/**
 * 易道管理后台 - Express 主入口
 */
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'yidao-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,  // 24小时
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// 信任 Nginx 代理
app.set('trust proxy', 1);

// 静态文件（管理后台 CSS/JS）
app.use('/admin/static', express.static(path.join(__dirname, 'views', 'static')));

// 商品图片（后台上传）
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// CORS（允许 yi-yao.net 前端调用）
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin.includes('yi-yao.net') || origin.includes('localhost'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-API-Key');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

// API 路由
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/products', require('./routes/products-public'));

// 管理后台路由
app.use('/admin', require('./routes/admin'));
app.use('/admin', require('./routes/products'));

// 健康检查
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ status: 'error', database: e.message });
    }
});

// 404
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Not Found' });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.message);
    res.status(500).json({ success: false, error: '服务器内部错误' });
});

// 启动
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`易道管理后台已启动，端口: ${PORT}`);
    
    // 验证数据库连接
    try {
        const result = await db.query('SELECT version()');
        console.log('PostgreSQL:', result.rows[0].version.substring(0, 50));
    } catch (e) {
        console.error('数据库连接失败:', e.message);
        console.log('请检查 .env 中的数据库配置');
    }
});
