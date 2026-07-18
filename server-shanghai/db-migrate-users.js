/**
 * 数据库迁移：用户系统增强
 * 运行: node db-migrate-users.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'yidao',
    user: process.env.DB_USER || 'yidao',
    password: process.env.DB_PASSWORD || '',
});

const SQL = `
-- 增强 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'l1';
ALTER TABLE users ADD COLUMN IF NOT EXISTS member_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 使用记录表
CREATE TABLE IF NOT EXISTS usage_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    phone VARCHAR(20),
    service_type VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id, service_type, created_at);
CREATE INDEX IF NOT EXISTS idx_usage_phone ON usage_logs(phone);

-- 用户索引
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);
`;

async function migrate() {
    console.log('正在执行用户系统数据库迁移...');
    try {
        await pool.query(SQL);
        console.log('迁移完成！');
        console.log('  - users 表已增强（level, member_until, avatar_url）');
        console.log('  - usage_logs 表已创建');
    } catch (e) {
        console.error('迁移失败:', e.message);
        process.exit(1);
    }
    await pool.end();
}

migrate();
