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
async function sendVerificationCode(phone) {
    // 限频检查
    const existing = codeMap.get(phone);
    if (existing && existing.sentAt && Date.now() - existing.sentAt < 60000) {
        const wait = Math.ceil((60000 - (Date.now() - existing.sentAt)) / 1000);
        return { success: false, error: `请${wait}秒后再试` };
    }

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
