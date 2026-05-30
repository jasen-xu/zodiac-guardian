#!/bin/bash
# 腾讯云 SCF 部署打包脚本
# 将前端静态文件 + 云函数代码打包为 zip

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$PROJECT_DIR/scf/build"
OUTPUT="$PROJECT_DIR/scf/scf-deploy.zip"

echo "📦 开始打包 SCF 部署包..."

# 清理旧构建
rm -rf "$BUILD_DIR"
rm -f "$OUTPUT"
mkdir -p "$BUILD_DIR/static"

# 复制云函数代码
cp "$PROJECT_DIR/scf/index.js" "$BUILD_DIR/"
cp "$PROJECT_DIR/scf/package.json" "$BUILD_DIR/"

# 复制 Web 函数启动脚本（如果存在）
if [ -f "$PROJECT_DIR/scf/scf_bootstrap" ]; then
    cp "$PROJECT_DIR/scf/scf_bootstrap" "$BUILD_DIR/"
    chmod +x "$BUILD_DIR/scf_bootstrap"
    echo "    ✅ scf_bootstrap (Web函数启动脚本)"
fi

# 复制前端静态文件
echo "  复制前端文件..."
for file in index.html guardian.html fortune.html liuyao.html; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        cp "$PROJECT_DIR/$file" "$BUILD_DIR/static/"
        echo "    ✅ $file"
    fi
done

# 复制目录
for dir in css js images audio; do
    if [ -d "$PROJECT_DIR/$dir" ]; then
        cp -r "$PROJECT_DIR/$dir" "$BUILD_DIR/static/"
        echo "    ✅ $dir/"
    fi
done

# 创建 zip 包
echo "  创建 zip 包..."
cd "$BUILD_DIR"
zip -r -q "$OUTPUT" .

# 清理构建目录
rm -rf "$BUILD_DIR"

# 显示结果
SIZE=$(du -h "$OUTPUT" | cut -f1)
echo ""
echo "✅ 打包完成！"
echo "📄 文件: scf/scf-deploy.zip ($SIZE)"
echo ""
echo "下一步操作："
echo "1. 登录腾讯云 SCF 控制台（地域选择：香港）"
echo "2. 创建函数，选择 '本地上传zip包'"
echo "3. 上传 scf-deploy.zip"
echo "4. 配置环境变量 DASHSCOPE_API_KEY"
echo "5. 添加 API 网关触发器（获取公网访问 URL）"
echo "6. 将触发器 URL 填入 js/liuyao.js 的 SCF_HK_URL 常量"
