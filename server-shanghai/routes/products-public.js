/**
 * 商品公开 API（无需登录）
 * 挂载于 /api/products，供官网/小程序经 SCF 代理拉取
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

// 已上架商品列表
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, name, series, category, description, price, stock, image_url, icon, color, link
             FROM products WHERE status = 'on'
             ORDER BY sort_order ASC, id ASC`
        );
        res.json({ success: true, data: { products: result.rows } });
    } catch (e) {
        console.error('公开商品列表查询失败:', e.message);
        res.status(500).json({ success: false, error: '查询失败' });
    }
});

module.exports = router;
