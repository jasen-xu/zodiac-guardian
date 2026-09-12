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

// 额度限制总开关：.env 中设置 QUOTA_ENABLED=false 可临时关闭所有限制（游客也不限次数）
// 后续功能完善后删除该环境变量或改为 true 即可恢复限制
const QUOTA_ENABLED = process.env.QUOTA_ENABLED !== 'false';

// 各层级额度配置（divine=六爻解卦, bazi=八字分析；period=计数周期, limit=周期内上限）
// 会员/VIP 为“每个服务各自”的每月上限；member_until 过期后自动按 l1 计（见 resolveUserLevel）
const QUOTA_CONFIG = {
    l0: { divine: { period: 'day', limit: 1 }, bazi: { period: 'day', limit: 0 } },        // 游客：六爻每日1次，八字不可用
    l1: { divine: { period: 'month', limit: 3 }, bazi: { period: 'month', limit: 1 } },     // 注册：六爻每月3次，八字每月1次
    l2: { divine: { period: 'month', limit: 10 }, bazi: { period: 'month', limit: 10 } },   // 会员：各每月10次
    l3: { divine: { period: 'month', limit: 50 }, bazi: { period: 'month', limit: 50 } },   // VIP：各每月50次
};

/**
 * 解析用户当前“有效等级”（修复原 level 硬编码缺陷）
 * - 无 userId（游客）→ l0
 * - 查 users 表真实 level（不依赖 JWT，避免等级变更后旧 token 不同步）
 * - 会员 l2 / VIP l3 若 member_until 已过期 → 降级为 l1（member_until 为空视为长期有效）
 */
async function resolveUserLevel(userId) {
    if (!userId) return 'l0';
    const result = await db.query('SELECT level, member_until FROM users WHERE id = $1', [userId]);
    if (!result.rows.length) return 'l1';  // 用户不存在，按注册兜底
    const { level, member_until } = result.rows[0];
    if ((level === 'l2' || level === 'l3') && member_until && new Date(member_until) < new Date()) {
        return 'l1';  // 会员/VIP 已过期，降级为注册
    }
    return level || 'l1';
}

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
        const { id, phone } = req.user;
        const level = await resolveUserLevel(id);  // 数据库真实等级（含过期降级），与 check-quota 一致
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
        // 限制开关关闭时，一律放行（不区分登录/游客）
        if (!QUOTA_ENABLED) {
            return res.json({
                success: true,
                data: { allowed: true, remaining: -1, used: 0, limit: -1 }
            });
        }

        const { userId, phone, serviceType } = req.body;
        const level = await resolveUserLevel(userId);  // 查真实等级：游客l0/注册l1/会员l2/VIP l3，会员过期自动降级

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
// 暴露内部函数与配置，供单元测试使用（挂在 router 函数上，不影响路由正常工作）
module.exports.resolveUserLevel = resolveUserLevel;
module.exports.QUOTA_CONFIG = QUOTA_CONFIG;
