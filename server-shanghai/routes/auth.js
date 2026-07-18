/**
 * 认证路由
 * POST /api/auth/send-code  - 发送验证码
 * POST /api/auth/login      - 手机号+验证码登录/注册
 * GET  /api/auth/me         - 获取当前用户信息
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const sms = require('../services/sms');
const { requireAuth, signToken } = require('../middleware/jwtAuth');

/**
 * POST /api/auth/send-code
 * 发送短信验证码
 */
router.post('/send-code', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !/^1\d{10}$/.test(phone)) {
            return res.json({ success: false, error: '请输入正确的手机号' });
        }

        const result = await sms.sendVerificationCode(phone);
        if (!result.success) {
            return res.json({ success: false, error: result.error });
        }

        res.json({ success: true, message: '验证码已发送' });
    } catch (e) {
        console.error('发送验证码失败:', e.message);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

/**
 * POST /api/auth/login
 * 手机号+验证码登录（自动注册新用户）
 */
router.post('/login', async (req, res) => {
    try {
        const { phone, code } = req.body;
        if (!phone || !/^1\d{10}$/.test(phone)) {
            return res.json({ success: false, error: '请输入正确的手机号' });
        }
        if (!code || !/^\d{6}$/.test(code)) {
            return res.json({ success: false, error: '请输入6位验证码' });
        }

        // 验证验证码
        if (!sms.verifyCode(phone, code)) {
            return res.json({ success: false, error: '验证码错误或已过期' });
        }

        // 查找或创建用户
        let userResult = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
        let user;

        if (userResult.rows.length === 0) {
            // 新用户注册
            const nickname = `用户${phone.slice(-4)}`;
            const insertResult = await db.query(
                `INSERT INTO users (phone, nickname, level) VALUES ($1, $2, 'l1') RETURNING *`,
                [phone, nickname]
            );
            user = insertResult.rows[0];
            console.log(`[注册] 新用户: ${phone} -> #${user.id}`);
        } else {
            user = userResult.rows[0];
            console.log(`[登录] 用户: ${phone} #${user.id}`);
        }

        // 签发 JWT
        const token = signToken(user);

        res.json({
            success: true,
            data: {
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    nickname: user.nickname,
                    level: user.level,
                    memberUntil: user.member_until,
                    gender: user.gender,
                    birthYear: user.birth_year,
                    birthMonth: user.birth_month,
                    birthDay: user.birth_day,
                    birthHour: user.birth_hour
                }
            }
        });
    } catch (e) {
        console.error('登录失败:', e.message);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息（需JWT）
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '用户不存在' });
        }
        const user = result.rows[0];
        res.json({
            success: true,
            data: {
                id: user.id,
                phone: user.phone,
                nickname: user.nickname,
                level: user.level,
                memberUntil: user.member_until,
                createdAt: user.created_at,
                gender: user.gender,
                birthYear: user.birth_year,
                birthMonth: user.birth_month,
                birthDay: user.birth_day,
                birthHour: user.birth_hour
            }
        });
    } catch (e) {
        console.error('获取用户信息失败:', e.message);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

module.exports = router;
