#!/bin/bash
# 一键部署到阿里云服务器
# 用法: ./deploy_to_server.sh

SERVER="root@43.99.101.195"
APP_USER="appuser"
APP_DIR="~/patent-app"

echo "=========================================="
echo "部署OCR迁移到阿里云服务器"
echo "服务器: $SERVER"
echo "=========================================="

# 执行远程部署
ssh $SERVER << 'ENDSSH'
set -e

echo ""
echo "[1/7] 切换到应用用户..."
su - appuser << 'ENDSU'
set -e

echo ""
echo "[2/7] 进入应用目录..."
cd ~/patent-app

echo ""
echo "[3/7] 拉取最新代码..."
git pull origin main

echo ""
echo "[4/7] 激活虚拟环境..."
source venv/bin/activate

echo ""
echo "[5/7] 卸载旧依赖..."
pip uninstall -y pytesseract 2>/dev/null || echo "  ℹ pytesseract不存在"
echo "  ℹ 保留Pillow（用于图像处理和未来的标注功能）"

echo ""
echo "[6/7] 安装新依赖..."
pip install -r requirements.txt

echo ""
echo "[7/7] 验证安装..."
python3 << 'PYEOF'
try:
    from rapidocr_onnxruntime import RapidOCR
    print("  ✓ RapidOCR安装成功")
    ocr = RapidOCR()
    print("  ✓ RapidOCR初始化成功")
except Exception as e:
    print(f"  ✗ 验证失败: {e}")
    exit(1)
PYEOF

echo ""
echo "应用用户操作完成"
ENDSU

echo ""
echo "[重启] 重启服务..."
systemctl restart patent-app

echo ""
echo "[检查] 等待服务启动..."
sleep 3

echo ""
echo "[状态] 服务状态："
systemctl status patent-app --no-pager | head -n 15

ENDSSH

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "后续操作："
echo "1. 查看日志: ssh $SERVER 'journalctl -u patent-app -f'"
echo "2. 测试功能: 访问功能八（附图标记识别）"
echo "3. 如有问题: 查看 SERVER_DEPLOYMENT_GUIDE.md"
echo ""
