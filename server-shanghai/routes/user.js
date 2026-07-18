/**
 * 用户路由
 * GET  /api/user/usage        - 查询剩余使用次数
 * POST /api/user/check-quota  - 检查额度（供 SCF 调用）
 * POST /api/user/consume-quota - 扣减额度（供 SCF 调用）
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/jwtAuth');
const { apiKeyAuth } = require('../middleware/auth');

// 各层级额度配置
const QUOTA_CONFIG = {
    l0: { divine: { period: 'day', limit: 1 }, bazi: { period: 'day', limit: 0 } },
    l1: { divine: { period: 'month', limit: 3 }, bazi: { period: 'month', limit: 1 } },
    l2: { divine: { period: 'month', limit: -1 }, bazi: { period: 'month', limit: -1 } },  // -1 = 无限
    l3: { divine: { period: 'month', limit: -1 }, bazi: { period: 'month', limit: -1 } },
};

/**
 * 计算已使用次数
 */
async function getUsageCount(userId, phone, serviceType, level) {
    const config = QUOTA_CONFIG[level]?.[serviceType];
    if (!config) return { used: 0, limit: 0 };
    if (config.limit === -1) return { used: 0, limit: -1 };

    let dateFilter;
    if (config.period === 'day') {
        dateFilter = "created_at >= CURRENT_DATE";
    } else {
        dateFilter = "created_at >= date_trunc('month', CURRENT_DATE)";
    }

    let result;
    if (userId) {
        result = await db.query(
            `SELECT COUNT(*) as count FROM usage_logs WHERE user_id = $1 AND service_type = $2 AND ${dateFilter}`,
            [userId, serviceType]
        );
    } else {
        // L0 游客按手机号/IP 计数
        result = await db.query(
            `SELECT COUNT(*) as count FROM usage_logs WHERE phone = $1 AND service_type = $2 AND ${dateFilter}`,
            [phone, serviceType]
        );
    }

    return { used: parseInt(result.rows[0].count), limit: config.limit };
}

/**
 * GET /api/user/usage
 * 查询当前用户剩余次数（需JWT）
 */
router.get('/usage', requireAuth, async (req, res) => {
    try {
        const { id, phone, level } = req.user;
        const divineUsage = await getUsageCount(id, phone, 'divine', level);
        const baziUsage = await getUsageCount(id, phone, 'bazi', level);

        res.json({
            success: true,
            data: {
                level,
                divine: {
                    used: divineUsage.used,
                    limit: divineUsage.limit,
                    remaining: divineUsage.limit === -1 ? -1 : Math.max(0, divineUsage.limit - divineUsage.used)
                },
                bazi: {
                    used: baziUsage.used,
                    limit: baziUsage.limit,
                    remaining: baziUsage.limit === -1 ? -1 : Math.max(0, baziUsage.limit - baziUsage.used)
                }
            }
        });
    } catch (e) {
        console.error('查询使用次数失败:', e.message);
        res.status(500).json({ success: false, error: '查询失败' });
    }
});

/**
 * POST /api/user/check-quota
 * 检查额度（供 SCF 调用，需 API Key）
 */
router.post('/check-quota', apiKeyAuth, async (req, res) => {
    try {
        const { userId, phone, serviceType } = req.body;
        const level = userId ? 'l1' : 'l0';  // 有 userId 视为注册用户

        const usage = await getUsageCount(userId, phone, serviceType, level);
        const remaining = usage.limit === -1 ? -1 : Math.max(0, usage.limit - usage.used);

        res.json({
            success: true,
            data: { allowed: remaining !== 0, remaining, used: usage.used, limit: usage.limit }
        });
    } catch (e) {
        console.error('检查额度失败:', e.message);
        res.status(500).json({ success: false, error: '查询失败' });
    }
});

/**
 * POST /api/user/consume-quota
 * 扣减额度（供 SCF 调用，需 API Key）
 */
router.post('/consume-quota', apiKeyAuth, async (req, res) => {
    try {
        const { userId, phone, serviceType } = req.body;

        await db.query(
            'INSERT INTO usage_logs (user_id, phone, service_type) VALUES ($1, $2, $3)',
            [userId || null, phone || null, serviceType]
        );

        console.log(`[消耗额度] user=${userId || 'guest'} phone=${phone} service=${serviceType}`);
        res.json({ success: true });
    } catch (e) {
        console.error('扣减额度失败:', e.message);
        res.status(500).json({ success: false, error: '记录失败' });
    }
});

/**
 * PUT /api/user/profile
 * 保存用户资料（性别+生辰）
 */
router.put('/profile', requireAuth, async (req, res) => {
    try {
        const { gender, birthYear, birthMonth, birthDay, birthHour } = req.body;

        // 校验
        if (gender && !['male', 'female'].includes(gender)) {
            return res.json({ success: false, error: '性别值无效' });
        }
        if (birthYear && (birthYear < 1920 || birthYear > 2026)) {
            return res.json({ success: false, error: '出生年份无效' });
        }
        if (birthMonth && (birthMonth < 1 || birthMonth > 12)) {
            return res.json({ success: false, error: '出生月份无效' });
        }
        if (birthDay && (birthDay < 1 || birthDay > 31)) {
            return res.json({ success: false, error: '出生日期无效' });
        }
        if (birthHour !== undefined && birthHour !== null && (birthHour < 0 || birthHour > 23)) {
            return res.json({ success: false, error: '出生时辰无效' });
        }

        await db.query(
            `UPDATE users SET
                gender = COALESCE($2, gender),
                birth_year = COALESCE($3, birth_year),
                birth_month = COALESCE($4, birth_month),
                birth_day = COALESCE($5, birth_day),
                birth_hour = COALESCE($6, birth_hour),
                updated_at = NOW()
            WHERE id = $1`,
            [req.user.id, gender || null, birthYear || null, birthMonth || null, birthDay || null, birthHour ?? null]
        );

        console.log(`[资料更新] 用户#${req.user.id}: gender=${gender}, birth=${birthYear}-${birthMonth}-${birthDay} ${birthHour}时`);
        res.json({ success: true, message: '资料已保存' });
    } catch (e) {
        console.error('保存资料失败:', e.message);
        res.status(500).json({ success: false, error: '保存失败' });
    }
});

module.exports = router;
