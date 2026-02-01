#!/bin/bash
# AI说明书处理器部署脚本 - Linux/Mac版本
# 用于生产环境部署（阿里云ECS、Render等）

set -e  # 遇到错误立即退出

echo "========================================"
echo "AI说明书处理器部署脚本"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查Python环境
echo "[1/8] 检查Python环境..."
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: 未找到Python3，请先安装Python 3.8+${NC}"
    exit 1
fi
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo -e "${GREEN}✓ Python版本: $PYTHON_VERSION${NC}"
echo ""

# 检查pip
echo "[2/8] 检查pip..."
if ! command -v pip3 &> /dev/null; then
    echo -e "${RED}错误: 未找到pip3${NC}"
    exit 1
fi
echo -e "${GREEN}✓ pip已安装${NC}"
echo ""

# 安装依赖
echo "[3/8] 安装Python依赖..."
pip3 install -r requirements.txt --quiet
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 依赖安装完成${NC}"
else
    echo -e "${RED}错误: 依赖安装失败${NC}"
    exit 1
fi
echo ""

# 检查配置文件
echo "[4/8] 检查配置文件..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}警告: .env 文件不存在，从示例文件复制...${NC}"
    cp .env.example .env
    echo ""
    echo -e "${YELLOW}重要: 请编辑 .env 文件并配置 ZHIPU_API_KEY${NC}"
    echo ""
fi

if [ ! -f "config/models.json" ]; then
    echo -e "${RED}错误: config/models.json 不存在${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 配置文件检查完成${NC}"
echo ""

# 验证环境变量
echo "[5/8] 验证环境变量..."
source .env 2>/dev/null || true

if [ -z "$ZHIPU_API_KEY" ] || [ "$ZHIPU_API_KEY" = "your-zhipu-api-key-here" ]; then
    echo -e "${YELLOW}警告: ZHIPU_API_KEY 未正确配置${NC}"
    echo "请设置环境变量或编辑 .env 文件"
    echo ""
else
    echo -e "${GREEN}✓ API密钥已配置${NC}"
fi
echo ""

# 创建必要的目录
echo "[6/8] 创建必要的目录..."
mkdir -p backend/services/ai_description
mkdir -p backend/templates/prompts
mkdir -p frontend/js/ai_description
mkdir -p frontend/css/components
mkdir -p logs
echo -e "${GREEN}✓ 目录创建完成${NC}"
echo ""

# 检查文件完整性
echo "[7/8] 检查文件完整性..."
REQUIRED_FILES=(
    "backend/services/ai_description/__init__.py"
    "backend/services/ai_description/language_detector.py"
    "backend/services/ai_description/translation_service.py"
    "backend/services/ai_description/ai_component_extractor.py"
    "backend/services/ai_description/ai_description_processor.py"
    "backend/templates/prompts/component_extraction.txt"
    "frontend/js/ai_description/ai_processing_panel.js"
    "frontend/js/ai_description/prompt_editor.js"
    "frontend/css/components/ai-description-processor.css"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ 缺少文件: $file${NC}"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
done

if [ $MISSING_FILES -gt 0 ]; then
    echo -e "${RED}错误: 缺少 $MISSING_FILES 个必需文件${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 所有必需文件存在${NC}"
echo ""

# 重启服务（如果是systemd服务）
echo "[8/8] 重启服务..."
if systemctl is-active --quiet patent-app; then
    echo "检测到systemd服务，正在重启..."
    sudo systemctl restart patent-app
    sleep 2
    if systemctl is-active --quiet patent-app; then
        echo -e "${GREEN}✓ 服务重启成功${NC}"
    else
        echo -e "${RED}错误: 服务重启失败${NC}"
        sudo systemctl status patent-app
        exit 1
    fi
else
    echo -e "${YELLOW}未检测到systemd服务，跳过重启${NC}"
    echo "请手动重启应用服务"
fi
echo ""

echo "========================================"
echo -e "${GREEN}部署完成！${NC}"
echo "========================================"
echo ""
echo "测试页面: http://your-domain/test_ai_description_processor.html"
echo ""
echo "相关文档:"
echo "  - 用户指南: docs/features/ai_description_processor_guide.md"
echo "  - 配置指南: docs/features/ai_description_processor_config.md"
echo ""
