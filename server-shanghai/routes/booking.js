/**
 * 预约 API 路由
 * POST /api/bookings - 创建预约（供 SCF 调用）
 * GET /api/bookings - 查询预约列表（供管理后台调用）
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { apiKeyAuth } = require('../middleware/auth');

// 服务类型映射
const TYPE_MAP = {
    survey: '生命地理勘测', ceremony: '生命礼仪全案', heritage: '家族文化建档',
    selection: '选址分析', layout: '空间布局', decor: '软装搭配', other: '其他需求'
};

/**
 * POST /api/bookings
 * 接收预约数据并存库（由 SCF 调用，需 API Key）
 */
router.post('/', apiKeyAuth, async (req, res) => {
    try {
        const { name, phone, area, type, desc, source, description } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ success: false, error: '姓名和手机号为必填项' });
        }

        const result = await db.query(
            `INSERT INTO bookings (name, phone, area, type, source, description, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')
             RETURNING id, created_at`,
            [name, phone, area || null, type || 'other', source || null, desc || description || null]
        );

        const booking = result.rows[0];
        console.log(`[预约入库] #${booking.id} ${name} ${phone} ${TYPE_MAP[type] || type}`);

        res.json({ success: true, data: { id: booking.id, created_at: booking.created_at } });
    } catch (e) {
        console.error('预约入库失败:', e.message);
        res.status(500).json({ success: false, error: '数据库写入失败' });
    }
});

module.exports = router;
