/**
 * 腾讯云短信服务封装
 * 
 * 环境变量：
 *   SMS_SECRET_ID   - 腾讯云 SecretId
 *   SMS_SECRET_KEY  - 腾讯云 SecretKey
 *   SMS_APP_ID      - 短信 SDK AppID
 *   SMS_SIGN        - 短信签名（如"易道"）
 *   SMS_TEMPLATE_ID - 验证码模板 ID
 */

// 验证码内存存储（后期可迁移 Redis）
const codeMap = new Map();

// 定期清理过期验证码（每10分钟）
setInterval(() => {
    const now = Date.now();
    for (const [phone, data] of codeMap) {
        if (data.expireAt < now) codeMap.delete(phone);
    }
}, 10 * 60 * 1000);

// ========== 短信发送限流（防刷 / 防短信轰炸 / 成本保护）==========
// 参数支持环境变量覆盖，便于压测与调优；默认值适用于生产。
// 注意：counters 为单实例内存计数，若将来多实例/多进程部署需迁移 Redis 共享。
const LIMITS = {
    PHONE_COOLDOWN_MS: Number(process.env.SMS_PHONE_COOLDOWN_MS) || 60 * 1000,  // 单号两次发送最小间隔（默认 60 秒）
    PHONE_HOUR_MAX: Number(process.env.SMS_PHONE_HOUR_MAX) || 5,    // 单号每小时上限
    PHONE_DAY_MAX: Number(process.env.SMS_PHONE_DAY_MAX) || 10,     // 单号每日上限
    IP_HOUR_MAX: Number(process.env.SMS_IP_HOUR_MAX) || 20,         // 单 IP 每小时上限（防换号轰炸）
    GLOBAL_DAY_MAX: Number(process.env.SMS_GLOBAL_DAY_MAX) || 500,  // 全站每日总量熔断阈值
};
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// 固定窗口计数器：key -> { count, expireAt }
const counters = new Map();

// 只读判断某窗口是否已达上限（不递增计数）
function peekLimit(key, limit) {
    const rec = counters.get(key);
    if (!rec || rec.expireAt <= Date.now()) return { limited: false };
    if (rec.count >= limit) return { limited: true, retryAfter: Math.ceil((rec.expireAt - Date.now()) / 1000) };
    return { limited: false };
}
// 递增某窗口计数（窗口不存在或已过期则新建）
function incrLimit(key, windowMs) {
    const now = Date.now();
    let rec = counters.get(key);
    if (!rec || rec.expireAt <= now) { rec = { count: 0, expireAt: now + windowMs }; counters.set(key, rec); }
    rec.count++;
}
// 定期清理过期计数（每10分钟）
setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of counters) {
        if (rec.expireAt <= now) counters.delete(key);
    }
}, 10 * 60 * 1000);

/**
 * 生成验证码
 */
function generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 发送验证码
 * @param {string} phone - 手机号
 * @returns {Promise<{success: boolean, error?: string, code?: string}>}
 */
async function sendVerificationCode(phone, ip) {
    // 第 1 道：单号 60 秒冷却（防重复点击 / 快速重发）
    const existing = codeMap.get(phone);
    if (existing && existing.sentAt && Date.now() - existing.sentAt < LIMITS.PHONE_COOLDOWN_MS) {
        const wait = Math.ceil((LIMITS.PHONE_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
        return { success: false, error: `请${wait}秒后再试` };
    }

    // 第 2~5 道：单号小时 / 单号每日 / 单 IP 小时 / 全局每日熔断。
    // 采用“先全量检查、通过后再统一计数”两阶段，避免中途拦截误占额度。
    const hourSlot = String(Math.floor(Date.now() / HOUR_MS));
    const daySlot = new Date().toISOString().slice(0, 10);
    const rules = [
        { key: `phone:h:${phone}:${hourSlot}`, limit: LIMITS.PHONE_HOUR_MAX, win: HOUR_MS, msg: '本小时获取验证码过于频繁，请稍后再试' },
        { key: `phone:d:${phone}:${daySlot}`, limit: LIMITS.PHONE_DAY_MAX, win: DAY_MS, msg: '今日验证码获取次数已达上限，请明天再试' },
    ];
    if (ip) rules.push({ key: `ip:h:${ip}:${hourSlot}`, limit: LIMITS.IP_HOUR_MAX, win: HOUR_MS, msg: '发送过于频繁，请稍后再试' });
    rules.push({ key: `global:d:${daySlot}`, limit: LIMITS.GLOBAL_DAY_MAX, win: DAY_MS, msg: '系统繁忙，请稍后再试', isGlobal: true });

    for (const r of rules) {
        if (peekLimit(r.key, r.limit).limited) {
            if (r.isGlobal) console.error(`[短信熔断] 当日发送总量已达上限 ${LIMITS.GLOBAL_DAY_MAX}，已暂停发送，请排查是否被刷！`);
            return { success: false, error: r.msg };
        }
    }
    for (const r of rules) incrLimit(r.key, r.win);  // 全部通过，统一递增计数

    const code = generateCode();
    const expireMinutes = 5;

    // 存储验证码
    codeMap.set(phone, {
        code,
        expireAt: Date.now() + expireMinutes * 60 * 1000,
        sentAt: Date.now()
    });

    // 检查是否配置了短信服务
    const secretId = process.env.SMS_SECRET_ID;
    const secretKey = process.env.SMS_SECRET_KEY;
    const appId = process.env.SMS_APP_ID;

    if (!secretId || !secretKey || !appId) {
        // 未配置短信服务，仅记录日志（开发模式）
        console.log(`[短信-测试模式] ${phone} 验证码: ${code}`);
        return { success: true, code }; // 测试模式返回验证码便于调试
    }

    // 调用腾讯云短信 API
    try {
        const tencentcloud = require('tencentcloud-sdk-nodejs');
        const SmsClient = tencentcloud.sms.v20210111.Client;

        const client = new SmsClient({
            credential: { secretId, secretKey },
            region: 'ap-guangzhou',
            profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } }
        });

        const result = await client.SendSms({
            SmsSdkAppId: appId,
            SignName: process.env.SMS_SIGN || '易道',
            TemplateId: process.env.SMS_TEMPLATE_ID || '',
            PhoneNumberSet: [`+86${phone}`],
            TemplateParamSet: [code, String(expireMinutes)]
        });

        const status = result.SendStatusSet?.[0];
        if (status?.Code === 'Ok') {
            console.log(`[短信] ${phone} 发送成功`);
            return { success: true };
        } else {
            console.error(`[短信] ${phone} 发送失败:`, status?.Message);
            return { success: false, error: '短信发送失败，请稍后重试' };
        }
    } catch (e) {
        console.error('[短信] SDK 错误:', e.message);
        return { success: false, error: '短信服务异常' };
    }
}

/**
 * 验证验证码
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @returns {boolean}
 */
function verifyCode(phone, code) {
    const data = codeMap.get(phone);
    if (!data) return false;
    if (data.expireAt < Date.now()) {
        codeMap.delete(phone);
        return false;
    }
    if (data.code !== code) return false;
    // 验证成功，删除验证码
    codeMap.delete(phone);
    return true;
}

module.exports = { sendVerificationCode, verifyCode };
