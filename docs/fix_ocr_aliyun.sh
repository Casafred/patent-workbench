#!/bin/bash
# 阿里云服务器OCR问题一键诊断和修复脚本

echo "=========================================="
echo "功能八OCR问题诊断和修复"
echo "=========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤1: 检查当前位置
echo -e "\n${YELLOW}[1/10] 检查当前位置...${NC}"
echo "当前目录: $(pwd)"
if [ ! -f "app.py" ] && [ ! -f "backend/app.py" ]; then
    echo -e "${RED}❌ 错误: 不在项目根目录${NC}"
    echo "请先cd到项目目录，例如: cd /home/appuser/patent-app"
    exit 1
fi
echo -e "${GREEN}✅ 位置正确${NC}"

# 步骤2: 检查Python版本
echo -e "\n${YELLOW}[2/10] 检查Python版本...${NC}"
PYTHON_CMD=""
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo "Python3版本: $(python3 --version)"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    echo "Python版本: $(python --version)"
else
    echo -e "${RED}❌ 未找到Python${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python可用: $PYTHON_CMD${NC}"

# 步骤3: 检查pip
echo -e "\n${YELLOW}[3/10] 检查pip...${NC}"
PIP_CMD=""
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
elif command -v pip &> /dev/null; then
    PIP_CMD="pip"
else
    echo -e "${RED}❌ 未找到pip${NC}"
    echo "尝试安装pip..."
    sudo apt-get update && sudo apt-get install -y python3-pip
    PIP_CMD="pip3"
fi
echo "Pip版本: $($PIP_CMD --version)"
echo -e "${GREEN}✅ Pip可用: $PIP_CMD${NC}"

# 步骤4: 检查虚拟环境
echo -e "\n${YELLOW}[4/10] 检查虚拟环境...${NC}"
if [ -d "venv" ]; then
    echo -e "${GREEN}✅ 发现虚拟环境: venv/${NC}"
    echo "激活虚拟环境..."
    source venv/bin/activate
    PYTHON_CMD="python"
    PIP_CMD="pip"
elif [ -d ".venv" ]; then
    echo -e "${GREEN}✅ 发现虚拟环境: .venv/${NC}"
    echo "激活虚拟环境..."
    source .venv/bin/activate
    PYTHON_CMD="python"
    PIP_CMD="pip"
else
    echo -e "${YELLOW}⚠️ 未发现虚拟环境，使用系统Python${NC}"
fi

# 步骤5: 检查已安装的OCR依赖
echo -e "\n${YELLOW}[5/10] 检查OCR依赖...${NC}"
MISSING_DEPS=()

check_package() {
    local package=$1
    local import_name=$2
    
    if $PYTHON_CMD -c "import $import_name" 2>/dev/null; then
        local version=$($PYTHON_CMD -c "import $import_name; print(getattr($import_name, '__version__', 'unknown'))" 2>/dev/null)
        echo -e "${GREEN}✅ $package: $version${NC}"
        return 0
    else
        echo -e "${RED}❌ $package: 未安装${NC}"
        MISSING_DEPS+=("$package")
        return 1
    fi
}

check_package "rapidocr-onnxruntime" "rapidocr_onnxruntime"
check_package "opencv-python" "cv2"
check_package "Pillow" "PIL"
check_package "numpy" "numpy"

# 步骤6: 安装缺失的依赖
if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "\n${YELLOW}[6/10] 安装缺失的依赖...${NC}"
    echo "缺失的包: ${MISSING_DEPS[*]}"
    
    # 尝试从requirements.txt安装
    if [ -f "requirements.txt" ]; then
        echo "从requirements.txt安装..."
        $PIP_CMD install -r requirements.txt
    else
        echo "直接安装缺失的包..."
        for dep in "${MISSING_DEPS[@]}"; do
            $PIP_CMD install "$dep"
        done
    fi
    
    # 再次检查
    echo -e "\n验证安装..."
    ALL_INSTALLED=true
    for dep in "${MISSING_DEPS[@]}"; do
        case $dep in
            "rapidocr-onnxruntime")
                if ! $PYTHON_CMD -c "import rapidocr_onnxruntime" 2>/dev/null; then
                    ALL_INSTALLED=false
                fi
                ;;
            "opencv-python")
                if ! $PYTHON_CMD -c "import cv2" 2>/dev/null; then
                    ALL_INSTALLED=false
                fi
                ;;
            "Pillow")
                if ! $PYTHON_CMD -c "import PIL" 2>/dev/null; then
                    ALL_INSTALLED=false
                fi
                ;;
            "numpy")
                if ! $PYTHON_CMD -c "import numpy" 2>/dev/null; then
                    ALL_INSTALLED=false
                fi
                ;;
        esac
    done
    
    if [ "$ALL_INSTALLED" = true ]; then
        echo -e "${GREEN}✅ 所有依赖安装成功${NC}"
    else
        echo -e "${RED}❌ 部分依赖安装失败${NC}"
        echo "请手动检查错误信息"
    fi
else
    echo -e "\n${GREEN}[6/10] 所有依赖已安装${NC}"
fi

# 步骤7: 运行诊断脚本
echo -e "\n${YELLOW}[7/10] 运行OCR诊断...${NC}"
if [ -f "diagnose_ocr_complete.py" ]; then
    $PYTHON_CMD diagnose_ocr_complete.py
else
    echo -e "${YELLOW}⚠️ 诊断脚本不存在，跳过${NC}"
fi

# 步骤8: 检查应用进程
echo -e "\n${YELLOW}[8/10] 检查应用进程...${NC}"
echo "查找Python/Gunicorn进程..."
ps aux | grep -E "python|gunicorn" | grep -v grep | head -5

echo -e "\n查找监听端口..."
sudo netstat -tlnp 2>/dev/null | grep -E ":80|:5000|:8000" || \
    ss -tlnp 2>/dev/null | grep -E ":80|:5000|:8000"

# 步骤9: 查找服务配置
echo -e "\n${YELLOW}[9/10] 查找服务配置...${NC}"

# 检查systemd服务
if systemctl list-units --type=service 2>/dev/null | grep -E "patent|flask|gunicorn" > /dev/null; then
    echo -e "${GREEN}✅ 发现systemd服务:${NC}"
    systemctl list-units --type=service | grep -E "patent|flask|gunicorn"
    
    echo -e "\n${YELLOW}建议重启命令:${NC}"
    SERVICE_NAME=$(systemctl list-units --type=service | grep -E "patent|flask|gunicorn" | awk '{print $1}' | head -1)
    echo "  sudo systemctl restart $SERVICE_NAME"
fi

# 检查supervisor
if command -v supervisorctl &> /dev/null; then
    echo -e "${GREEN}✅ 发现supervisor:${NC}"
    sudo supervisorctl status 2>/dev/null | grep -E "patent|flask|gunicorn" || echo "  (无相关进程)"
    
    echo -e "\n${YELLOW}建议重启命令:${NC}"
    echo "  sudo supervisorctl restart all"
fi

# 检查nginx
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ 发现nginx${NC}"
    echo -e "\n${YELLOW}建议重启命令:${NC}"
    echo "  sudo systemctl restart nginx"
fi

# 步骤10: 提供重启建议
echo -e "\n${YELLOW}[10/10] 重启建议${NC}"
echo "=========================================="
echo "依赖已更新，需要重启应用以生效"
echo "=========================================="

echo -e "\n${GREEN}方法1: 使用systemd (推荐)${NC}"
echo "  sudo systemctl restart <服务名>"
echo "  sudo systemctl status <服务名>"

echo -e "\n${GREEN}方法2: 使用supervisor${NC}"
echo "  sudo supervisorctl restart all"
echo "  sudo supervisorctl status"

echo -e "\n${GREEN}方法3: 手动重启gunicorn${NC}"
echo "  sudo pkill -HUP gunicorn"
echo "  或"
echo "  ps aux | grep gunicorn  # 找到PID"
echo "  sudo kill -HUP <PID>"

echo -e "\n${GREEN}方法4: 完全重启 (如果以上都不行)${NC}"
echo "  ps aux | grep python | grep -v grep  # 找到所有Python进程"
echo "  sudo kill <PID>  # 杀死旧进程"
echo "  # 然后重新启动应用"

echo -e "\n${YELLOW}查看日志:${NC}"
echo "  tail -f logs/error.log"
echo "  或"
echo "  sudo journalctl -u <服务名> -f"

echo -e "\n${YELLOW}测试功能八:${NC}"
echo "  1. 重启应用后，访问网站"
echo "  2. 进入功能八（专利附图标记识别）"
echo "  3. 上传测试图片: test_ocr_diagnostic.png"
echo "  4. 输入说明书: 1. 底座 2. 旋转臂 3. 夹紧装置"
echo "  5. 查看识别结果是否正常"

echo -e "\n=========================================="
echo -e "${GREEN}诊断完成！${NC}"
echo "=========================================="
