/**
 * 管理后台路由
 * 页面路由 + 数据 API
 */
const express = require('express');
const path = require('path');
const router = express.Router();
const db = require('../db');
const { adminAuth, verifyPassword } = require('../middleware/auth');

const TYPE_MAP = {
    survey: '生命地理勘测', ceremony: '生命礼仪全案', heritage: '家族文化建档',
    selection: '选址分析', layout: '空间布局', decor: '软装搭配', other: '其他需求'
};

const STATUS_MAP = {
    pending: '待联系', contacted: '已联系', completed: '已完成', cancelled: '已取消'
};

// ===== 页面路由 =====

// 登录页
router.get('/login', (req, res) => {
    if (req.session && req.session.isAdmin) return res.redirect('/admin');
    res.sendFile(path.join(__dirname, '..', 'views', 'login.html'));
});

// 仪表盘
router.get('/', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

// 预约列表
router.get('/bookings', adminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'bookings.html'));
});

// ===== 认证 API =====

// 登录
router.post('/api/login', async (req, res) => {
    const { password } = req.body;
    if (!password) return res.json({ success: false, error: '请输入密码' });

    const valid = await verifyPassword(password);
    if (!valid) return res.json({ success: false, error: '密码错误' });

    req.session.isAdmin = true;
    req.session.loginTime = new Date().toISOString();
    res.json({ success: true });
});

// 登出
router.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ===== 数据 API =====

// 统计数据
router.get('/api/stats', adminAuth, async (req, res) => {
    try {
        const [totalResult, pendingResult, monthResult, statusResult] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM bookings'),
            db.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'"),
            db.query(`SELECT COUNT(*) as count FROM bookings 
                      WHERE created_at >= date_trunc('month', CURRENT_DATE)`),
            db.query(`SELECT status, COUNT(*) as count FROM bookings 
                      GROUP BY status ORDER BY count DESC`)
        ]);

        res.json({
            success: true,
            data: {
                total: parseInt(totalResult.rows[0].count),
                pending: parseInt(pendingResult.rows[0].count),
                thisMonth: parseInt(monthResult.rows[0].count),
                byStatus: statusResult.rows.map(r => ({
                    status: STATUS_MAP[r.status] || r.status,
                    count: parseInt(r.count)
                }))
            }
        });
    } catch (e) {
        console.error('统计查询失败:', e.message);
        res.status(500).json({ success: false, error: '查询失败' });
    }
});

// 预约列表（分页 + 筛选）
router.get('/api/bookings', adminAuth, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const status = req.query.status || '';
        const search = req.query.search || '';

        let where = '1=1';
        const params = [];
        let paramIdx = 1;

        if (status) {
            where += ` AND status = $${paramIdx++}`;
            params.push(status);
        }
        if (search) {
            where += ` AND (name ILIKE $${paramIdx} OR phone ILIKE $${paramIdx} OR description ILIKE $${paramIdx})`;
            params.push(`%${search}%`);
            paramIdx++;
        }

        const [dataResult, countResult] = await Promise.all([
            db.query(
                `SELECT id, name, phone, area, type, source, description, status, remark, created_at, updated_at
                 FROM bookings WHERE ${where}
                 ORDER BY created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
                [...params, limit, offset]
            ),
            db.query(`SELECT COUNT(*) as count FROM bookings WHERE ${where}`, params)
        ]);

        const total = parseInt(countResult.rows[0].count);
        res.json({
            success: true,
            data: {
                bookings: dataResult.rows.map(b => ({
                    ...b,
                    typeName: TYPE_MAP[b.type] || b.type,
                    statusName: STATUS_MAP[b.status] || b.status
                })),
                pagination: { page, limit, total, pages: Math.ceil(total / limit) }
            }
        });
    } catch (e) {
        console.error('预约列表查询失败:', e.message);
        res.status(500).json({ success: false, error: '查询失败' });
    }
});

// 更新预约状态
router.put('/api/bookings/:id/status', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remark } = req.body;

        const validStatuses = ['pending', 'contacted', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: '无效的状态值' });
        }

        const updates = ['status = $1', "updated_at = NOW()"];
        const params = [status];
        let paramIdx = 2;

        if (remark !== undefined) {
            updates.push(`remark = $${paramIdx++}`);
            params.push(remark);
        }

        params.push(id);
        const result = await db.query(
            `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '预约不存在' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error('更新预约状态失败:', e.message);
        res.status(500).json({ success: false, error: '更新失败' });
    }
});

// 添加备注
router.put('/api/bookings/:id/remark', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { remark } = req.body;

        const result = await db.query(
            'UPDATE bookings SET remark = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [remark, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '预约不存在' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (e) {
        console.error('更新备注失败:', e.message);
        res.status(500).json({ success: false, error: '更新失败' });
    }
});

module.exports = router;
