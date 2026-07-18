/**
 * 数据库迁移：用户资料（性别+生辰八字）
 * 运行: node db-migrate-profile.js
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
-- 用户资料字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_year INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_month INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_day INT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_hour INT;
`;

async function migrate() {
    console.log('正在执行用户资料迁移...');
    try {
        await pool.query(SQL);
        console.log('迁移完成！');
        console.log('  - users 表已增加：gender, birth_year, birth_month, birth_day, birth_hour');
    } catch (e) {
        console.error('迁移失败:', e.message);
        process.exit(1);
    }
    await pool.end();
}

migrate();
