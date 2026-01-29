#!/bin/bash
# OCR迁移部署脚本 - 阿里云服务器
# 用途：部署RapidOCR替换Tesseract

set -e  # 遇到错误立即退出

echo "=========================================="
echo "OCR迁移部署脚本"
echo "=========================================="

# 1. 拉取最新代码
echo ""
echo "[1/6] 拉取最新代码..."
cd ~/patent-app
git pull origin main

# 2. 激活虚拟环境
echo ""
echo "[2/6] 激活虚拟环境..."
source venv/bin/activate

# 3. 卸载旧的Tesseract依赖（如果存在）
echo ""
echo "[3/6] 卸载旧的Tesseract依赖..."
pip uninstall -y pytesseract || echo "  ℹ pytesseract已不存在或已卸载"
echo "  ℹ 保留Pillow（用于图像处理和未来的标注功能）"

# 4. 安装新依赖
echo ""
echo "[4/6] 安装新依赖..."
pip install -r requirements.txt

# 5. 验证安装
echo ""
echo "[5/6] 验证安装..."
python3 << 'PYEOF'
try:
    from rapidocr_onnxruntime import RapidOCR
    import cv2
    import numpy as np
    print("  ✓ RapidOCR安装成功")
    
    # 测试初始化
    ocr = RapidOCR()
    print("  ✓ RapidOCR初始化成功")
    
except ImportError as e:
    print(f"  ✗ 安装验证失败: {e}")
    exit(1)
except Exception as e:
    print(f"  ✗ 初始化失败: {e}")
    exit(1)
PYEOF

# 6. 重启服务
echo ""
echo "[6/6] 重启服务..."
sudo systemctl restart patent-app

# 等待服务启动
echo ""
echo "等待服务启动..."
sleep 3

# 检查服务状态
echo ""
echo "检查服务状态..."
sudo systemctl status patent-app --no-pager | head -n 10

echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
echo "后续步骤："
echo "1. 检查日志: sudo journalctl -u patent-app -f"
echo "2. 测试OCR功能: 访问功能八（附图标记识别）"
echo "3. 如有问题，查看: ~/patent-app/OCR_MIGRATION_DEPLOYMENT.md"
echo ""
