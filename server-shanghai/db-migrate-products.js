/**
 * 数据库迁移：商品管理（一期）
 * 运行: node db-migrate-products.js
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
-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    series VARCHAR(30) NOT NULL DEFAULT '灵犀珠系列',
    category VARCHAR(20) NOT NULL DEFAULT 'prayer',
    description TEXT DEFAULT '',
    price VARCHAR(50) DEFAULT '',
    stock INT DEFAULT 0,
    image_url TEXT DEFAULT '',
    icon VARCHAR(16) DEFAULT '🎁',
    color VARCHAR(160) DEFAULT 'linear-gradient(135deg, #E8D5B7, #C9A87C)',
    link VARCHAR(500) DEFAULT '#',
    status VARCHAR(10) DEFAULT 'on',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
`;

// 种子数据：现有文创雅集 12 件商品（表为空时才写入）
const SEED = [
    ['本命佛纯银挂件', '灵犀珠系列', 'prayer', '十二生肖守护佛，999纯银铸造，精工细作', '¥298 - ¥598', '🙏', 'linear-gradient(135deg, #E8D5B7, #C9A87C)', 1],
    ['和田玉平安扣', '灵犀珠系列', 'prayer', '天然和田玉，温润细腻，寓意平安吉祥', '¥388 - ¥1280', '🪷', 'linear-gradient(135deg, #D4E6D4, #A8C8A8)', 2],
    ['檀木手串', '灵犀珠系列', 'prayer', '小叶紫檀108颗佛珠，匠心手作', '¥168 - ¥680', '📿', 'linear-gradient(135deg, #8B6B4A, #5C4033)', 3],
    ['手工刺绣护身符', '灵犀珠系列', 'prayer', '苏绣锦囊符袋，内置传统平安符', '¥128 - ¥298', '🧧', 'linear-gradient(135deg, #E8B4B4, #BC2C24)', 4],
    ['手书心经摆件', '墨韵系列', 'art', '名家手写般若心经，宣纸装裱，紫檀木框', '¥580 - ¥1680', '📜', 'linear-gradient(135deg, #F5EDE0, #DCD2C0)', 5],
    ['水墨山水小品', '墨韵系列', 'art', '原创水墨山水画，适合书房茶室悬挂', '¥880 - ¥3600', '🎨', 'linear-gradient(135deg, #C8D8C8, #8FA88F)', 6],
    ['禅意建盏茶杯', '墨韵系列', 'art', '非遗传承人手作建盏，天目釉色变幻', '¥268 - ¥1200', '🍵', 'linear-gradient(135deg, #B8A88A, #8B7355)', 7],
    ['沉香线香礼盒', '墨韵系列', 'art', '天然越南沉香，配铜香插，静心品茗', '¥198 - ¥580', '🪔', 'linear-gradient(135deg, #D4C4A8, #A89070)', 8],
    ['纯铜貔貅摆件', '空间文化系列', 'space', '精铸黄铜貔貅，传统吉祥寓意', '¥368 - ¥1580', '🐉', 'linear-gradient(135deg, #D4AF37, #8B7020)', 9],
    ['精铜罗盘', '空间文化系列', 'space', '三合罗盘，纯铜铸造，传统文化雅器', '¥480 - ¥2680', '🧭', 'linear-gradient(135deg, #C9A87C, #8B6914)', 10],
    ['五帝钱', '空间文化系列', 'space', '真品五帝铜钱，传统民俗文化寓意', '¥168 - ¥398', '🪙', 'linear-gradient(135deg, #D4C090, #A89060)', 11],
    ['铜质文昌塔', '空间文化系列', 'space', '九层文昌塔，传统民俗寓意学业功名', '¥298 - ¥880', '🗼', 'linear-gradient(135deg, #C8B888, #9A8858)', 12]
];

async function migrate() {
    console.log('正在执行商品管理数据库迁移...');
    try {
        await pool.query(SQL);
        console.log('  - products 表已就绪');

        const { rows } = await pool.query('SELECT COUNT(*) AS count FROM products');
        if (parseInt(rows[0].count) === 0) {
            for (const [name, series, category, description, price, icon, color, sortOrder] of SEED) {
                await pool.query(
                    `INSERT INTO products (name, series, category, description, price, icon, color, sort_order)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [name, series, category, description, price, icon, color, sortOrder]
                );
            }
            console.log(`  - 已写入 ${SEED.length} 件存量商品（种子数据）`);
        } else {
            console.log('  - 表中已有商品，跳过种子数据');
        }
        console.log('迁移完成！');
    } catch (e) {
        console.error('迁移失败:', e.message);
        process.exit(1);
    }
    await pool.end();
}

migrate();
