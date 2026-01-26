#!/bin/bash

# 阿里云OCR依赖安装脚本
# 用途：在阿里云服务器上安装功能八所需的Python库

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  阿里云OCR依赖安装脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在正确的目录
if [ ! -f "backend/routes/drawing_marker.py" ]; then
    echo -e "${RED}❌ 错误：请在应用根目录运行此脚本${NC}"
    echo "当前目录：$(pwd)"
    echo "应该在：/home/appuser/patent-app"
    exit 1
fi

echo -e "${GREEN}✓ 当前目录正确${NC}"
echo ""

# 第一步：检查Python环境
echo "第一步：检查Python环境"
echo "----------------------------------------"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3未安装${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ Python版本：$PYTHON_VERSION${NC}"

if ! command -v pip3 &> /dev/null; then
    echo -e "${YELLOW}⚠ pip3未安装，正在安装...${NC}"
    sudo apt-get update
    sudo apt-get install -y python3-pip
fi

PIP_VERSION=$(pip3 --version)
echo -e "${GREEN}✓ pip版本：$PIP_VERSION${NC}"
echo ""

# 第二步：检查Tesseract
echo "第二步：检查Tesseract OCR"
echo "----------------------------------------"

if ! command -v tesseract &> /dev/null; then
    echo -e "${RED}❌ Tesseract未安装${NC}"
    echo "请先安装Tesseract："
    echo "  sudo apt-get install tesseract-ocr"
    exit 1
fi

TESSERACT_VERSION=$(tesseract --version 2>&1 | head -n 1)
echo -e "${GREEN}✓ $TESSERACT_VERSION${NC}"
echo ""

# 第三步：检查虚拟环境
echo "第三步：检查虚拟环境"
echo "----------------------------------------"

if [ -d "venv" ] || [ -d ".venv" ]; then
    echo -e "${YELLOW}⚠ 检测到虚拟环境${NC}"
    
    if [ -d "venv" ]; then
        VENV_PATH="venv"
    else
        VENV_PATH=".venv"
    fi
    
    echo "虚拟环境路径：$VENV_PATH"
    echo "是否在虚拟环境中安装？(y/n)"
    read -r USE_VENV
    
    if [ "$USE_VENV" = "y" ] || [ "$USE_VENV" = "Y" ]; then
        echo -e "${GREEN}✓ 激活虚拟环境${NC}"
        source $VENV_PATH/bin/activate
        INSTALL_CMD="pip install"
    else
        echo -e "${YELLOW}⚠ 将在系统Python中安装${NC}"
        INSTALL_CMD="pip3 install --user"
    fi
else
    echo -e "${GREEN}✓ 未检测到虚拟环境，将在系统Python中安装${NC}"
    INSTALL_CMD="pip3 install --user"
fi
echo ""

# 第四步：安装Python库
echo "第四步：安装Python库"
echo "----------------------------------------"

echo "正在安装：pytesseract opencv-python Pillow"
echo ""

# 尝试安装
if $INSTALL_CMD pytesseract==0.3.10 opencv-python==4.8.1.78 Pillow==10.1.0; then
    echo -e "${GREEN}✓ 安装成功${NC}"
else
    echo -e "${YELLOW}⚠ 标准安装失败，尝试使用--break-system-packages${NC}"
    if pip3 install --break-system-packages pytesseract==0.3.10 opencv-python==4.8.1.78 Pillow==10.1.0; then
        echo -e "${GREEN}✓ 安装成功${NC}"
    else
        echo -e "${RED}❌ 安装失败${NC}"
        echo "请手动安装："
        echo "  pip3 install pytesseract opencv-python Pillow"
        exit 1
    fi
fi
echo ""

# 第五步：验证安装
echo "第五步：验证安装"
echo "----------------------------------------"

python3 << 'PYEOF'
import sys

success = True

try:
    import pytesseract
    print(f"✅ pytesseract: {pytesseract.__version__}")
except ImportError as e:
    print(f"❌ pytesseract: NOT INSTALLED - {e}")
    success = False

try:
    import cv2
    print(f"✅ opencv-python: {cv2.__version__}")
except ImportError as e:
    print(f"❌ opencv-python: NOT INSTALLED - {e}")
    success = False

try:
    from PIL import Image
    import PIL
    print(f"✅ Pillow: {PIL.__version__}")
except ImportError as e:
    print(f"❌ Pillow: NOT INSTALLED - {e}")
    success = False

if not success:
    sys.exit(1)
PYEOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 所有库验证成功${NC}"
else
    echo -e "${RED}❌ 验证失败${NC}"
    exit 1
fi
echo ""

# 第六步：清除Python缓存
echo "第六步：清除Python缓存"
echo "----------------------------------------"

echo "正在清除__pycache__目录..."
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
echo -e "${GREEN}✓ 缓存已清除${NC}"
echo ""

# 第七步：检查应用进程
echo "第七步：检查应用进程"
echo "----------------------------------------"

echo "正在查找应用进程..."
PROCESSES=$(ps aux | grep -E "python.*app|gunicorn|uwsgi" | grep -v grep)

if [ -z "$PROCESSES" ]; then
    echo -e "${YELLOW}⚠ 未找到运行中的应用进程${NC}"
    echo "请手动启动应用"
else
    echo "找到以下进程："
    echo "$PROCESSES"
    echo ""
    echo "是否需要重启应用？(y/n)"
    read -r RESTART_APP
    
    if [ "$RESTART_APP" = "y" ] || [ "$RESTART_APP" = "Y" ]; then
        echo ""
        echo "请选择重启方式："
        echo "1) systemctl restart (需要服务名)"
        echo "2) 杀死进程并手动重启"
        echo "3) 跳过重启"
        read -r RESTART_METHOD
        
        case $RESTART_METHOD in
            1)
                echo "请输入服务名（如：patent-app）："
                read -r SERVICE_NAME
                sudo systemctl restart $SERVICE_NAME
                echo -e "${GREEN}✓ 服务已重启${NC}"
                ;;
            2)
                echo "正在杀死进程..."
                pkill -f "python.*app" || true
                pkill -f "gunicorn" || true
                pkill -f "uwsgi" || true
                echo -e "${YELLOW}⚠ 进程已杀死，请手动重启应用${NC}"
                ;;
            3)
                echo -e "${YELLOW}⚠ 跳过重启${NC}"
                ;;
        esac
    fi
fi
echo ""

# 完成
echo "=========================================="
echo -e "${GREEN}  安装完成！${NC}"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 如果应用未重启，请手动重启"
echo "2. 打开网站测试功能八"
echo "3. 查看日志确认OCR识别正常工作"
echo ""
echo "查看日志："
echo "  tail -f logs/error.log"
echo "  或"
echo "  sudo journalctl -u your-service-name -f"
echo ""
echo "测试功能八："
echo "1. 上传专利附图"
echo "2. 输入说明书内容"
echo "3. 点击'开始处理'"
echo "4. 查看识别结果（应该不再是0个）"
echo ""
