/**
 * PostgreSQL 数据库连接池
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'yidao',
    user: process.env.DB_USER || 'yidao',
    password: process.env.DB_PASSWORD || '',
    max: 10,           // 最大连接数（2G内存足够）
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('数据库连接池错误:', err.message);
});

pool.on('connect', () => {
    console.log('数据库连接池已连接');
});

/**
 * 执行查询
 * @param {string} text - SQL 语句
 * @param {Array} params - 参数
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
        console.log(`[DB] 慢查询 ${duration}ms: ${text.substring(0, 80)}`);
    }
    return result;
}

module.exports = { pool, query };
