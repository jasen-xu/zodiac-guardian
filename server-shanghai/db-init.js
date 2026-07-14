/**
 * 数据库初始化脚本
 * 运行: npm run init-db 或 node db-init.js
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
-- 预约表
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    area VARCHAR(100),
    type VARCHAR(30),
    source VARCHAR(30),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户表（预留）
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE,
    nickname VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_source ON bookings(source);
`;

async function init() {
    console.log('正在初始化数据库...');
    try {
        await pool.query(SQL);
        console.log('数据库初始化完成！');
        console.log('  - bookings 表已创建');
        console.log('  - users 表已创建（预留）');
        console.log('  - 索引已创建');
    } catch (e) {
        console.error('初始化失败:', e.message);
        console.log('请检查 .env 中的数据库配置是否正确');
        process.exit(1);
    }
    await pool.end();
}

init();
