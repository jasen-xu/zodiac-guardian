/**
 * 商品管理路由（管理后台）
 * 挂载于 /admin：页面 + CRUD API + 图片上传
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const { adminAuth } = require('../middleware/auth');

// ===== 图片上传（multer） =====
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `p${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|png|gif|webp)$/.test(file.mimetype)) return cb(null, true);
        cb(new Error('仅支持 jpg/png/gif/webp 图片'));
    }
});

const SERIES_LIST = ['灵犀珠系列', '墨韵系列', '空间文化系列'];
const CATEGORY_LIST = ['prayer', 'art', 'space'];

// ===== 页面路由 =====

// 商品管理页
router.get('/products', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'products.html'));
});

// ===== 管理 API =====

// 商品列表（含已下架，支持筛选）
router.get('/api/products', adminAuth, async (req, res) => {
    try {
        const status = req.query.status || '';
        const category = req.query.category || '';
        const search = req.query.search || '';

        let where = '1=1';
        const params = [];
        let idx = 1;
        if (status) { where += ` AND status = $${idx++}`; params.push(status); }
        if (category) { where += ` AND category = $${idx++}`; params.push(category); }
        if (search) { where += ` AND (name ILIKE $${idx} OR description ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

        const result = await db.query(
            `SELECT * FROM products WHERE ${where} ORDER BY sort_order ASC, id ASC`,
            params
        );
        res.json({ success: true, data: { products: result.rows, seriesList: SERIES_LIST, categoryList: CATEGORY_LIST } });
    } catch (e) {
        console.error('商品列表查询失败:', e.message);
        res.status(500).json({ success: false, error: '查询失败' });
    }
});

// 字段校验
function validateBody(body) {
    if (!body.name || !String(body.name).trim()) return '商品名称不能为空';
    if (body.category && !CATEGORY_LIST.includes(body.category)) return '无效的分类';
    if (body.status && !['on', 'off'].includes(body.status)) return '无效的状态';
    if (body.stock !== undefined && (isNaN(parseInt(body.stock)) || parseInt(body.stock) < 0)) return '库存须为非负整数';
    return null;
}

// 新增商品
router.post('/api/products', adminAuth, async (req, res) => {
    try {
        const err = validateBody(req.body);
        if (err) return res.status(400).json({ success: false, error: err });

        const { name, series, category, description, price, stock, image_url, icon, color, link, status, sort_order } = req.body;
        const result = await db.query(
            `INSERT INTO products (name, series, category, description, price, stock, image_url, icon, color, link, status, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [
                String(name).trim(),
                series || '灵犀珠系列',
                category || 'prayer',
                description || '',
                price || '',
                parseInt(stock) || 0,
                image_url || '',
                icon || '🎁',
                color || 'linear-gradient(135deg, #E8D5B7, #C9A87C)',
                link || '#',
                status || 'on',
                parseInt(sort_order) || 0
            ]
        );
        res.json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error('新增商品失败:', e.message);
        res.status(500).json({ success: false, error: '新增失败' });
    }
});

// 更新商品
router.put('/api/products/:id', adminAuth, async (req, res) => {
    try {
        const err = validateBody(req.body);
        if (err) return res.status(400).json({ success: false, error: err });

        const { name, series, category, description, price, stock, image_url, icon, color, link, status, sort_order } = req.body;
        const result = await db.query(
            `UPDATE products SET name=$1, series=$2, category=$3, description=$4, price=$5, stock=$6,
                image_url=$7, icon=$8, color=$9, link=$10, status=$11, sort_order=$12, updated_at=NOW()
             WHERE id=$13 RETURNING *`,
            [
                String(name).trim(),
                series || '灵犀珠系列',
                category || 'prayer',
                description || '',
                price || '',
                parseInt(stock) || 0,
                image_url || '',
                icon || '🎁',
                color || 'linear-gradient(135deg, #E8D5B7, #C9A87C)',
                link || '#',
                status || 'on',
                parseInt(sort_order) || 0,
                req.params.id
            ]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, error: '商品不存在' });
        res.json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error('更新商品失败:', e.message);
        res.status(500).json({ success: false, error: '更新失败' });
    }
});

// 删除商品（连同已上传的图片文件）
router.delete('/api/products/:id', adminAuth, async (req, res) => {
    try {
        const found = await db.query('SELECT image_url FROM products WHERE id = $1', [req.params.id]);
        if (found.rows.length === 0) return res.status(404).json({ success: false, error: '商品不存在' });

        await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);

        // 清理图片文件（仅限本服务上传目录内的文件）
        const imgUrl = found.rows[0].image_url || '';
        if (imgUrl.startsWith('/uploads/products/')) {
            const filePath = path.join(UPLOAD_DIR, path.basename(imgUrl));
            if (filePath.startsWith(UPLOAD_DIR) && fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        res.json({ success: true });
    } catch (e) {
        console.error('删除商品失败:', e.message);
        res.status(500).json({ success: false, error: '删除失败' });
    }
});

// 图片上传
router.post('/api/upload', adminAuth, (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ success: false, error: err.message });
        if (!req.file) return res.status(400).json({ success: false, error: '请选择图片文件' });
        res.json({ success: true, data: { url: `/uploads/products/${req.file.filename}` } });
    });
});

module.exports = router;
