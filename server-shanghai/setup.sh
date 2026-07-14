#!/bin/bash
# 易道管理后台 - 服务器环境搭建脚本
# 适用于 Ubuntu/Debian 系统
# 用法: sudo bash setup.sh

set -e

echo "=========================================="
echo "  易道管理后台 - 服务器环境搭建"
echo "=========================================="

# 检查 root
if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 系统更新
echo "[1/6] 更新系统包..."
apt update && apt upgrade -y

# 2. 安装 Node.js 20 LTS
echo "[2/6] 安装 Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo "Node.js $(node -v) 安装完成"
else
    echo "Node.js 已安装: $(node -v)"
fi

# 3. 安装 PostgreSQL
echo "[3/6] 安装 PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl enable postgresql
    systemctl start postgresql
    echo "PostgreSQL 安装完成"
else
    echo "PostgreSQL 已安装"
fi

# 4. 配置数据库
echo "[4/6] 配置数据库..."
DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'A-Za-z0-9' | head -c 16)
sudo -u postgres psql -c "CREATE USER yidao WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || echo "用户已存在"
sudo -u postgres psql -c "CREATE DATABASE yidao OWNER yidao;" 2>/dev/null || echo "数据库已存在"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE yidao TO yidao;"
echo "数据库配置完成，密码: ${DB_PASSWORD}"

# 5. 安装 Nginx
echo "[5/6] 安装 Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl enable nginx
    echo "Nginx 安装完成"
else
    echo "Nginx 已安装"
fi

# 6. 安装 PM2
echo "[6/6] 安装 PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup
    echo "PM2 安装完成"
else
    echo "PM2 已安装"
fi

echo ""
echo "=========================================="
echo "  环境搭建完成！"
echo "=========================================="
echo ""
echo "数据库密码: ${DB_PASSWORD}"
echo ""
echo "后续步骤："
echo "1. 将 server-shanghai 目录上传到服务器 /opt/yidao-admin/"
echo "2. 修改 /opt/yidao-admin/.env 中的数据库密码为上面的密码"
echo "3. cd /opt/yidao-admin && npm install"
echo "4. npm run init-db"
echo "5. pm2 start app.js --name yidao-admin"
echo "6. 配置 Nginx 反向代理（见 nginx.conf）"
echo ""
