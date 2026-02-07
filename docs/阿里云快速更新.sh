#!/bin/bash
# 阿里云服务器快速更新脚本 - 功能八优化
# 使用方法：bash 阿里云快速更新.sh

echo "========================================"
echo "功能八OCR标注优化 - 快速更新"
echo "========================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 检查当前目录
echo "步骤 1/8: 检查当前目录..."
if [ ! -d ".git" ]; then
    echo -e "${RED}错误：当前不在 Git 仓库目录${NC}"
    echo "请先执行：cd /www/wwwroot/patent-workbench"
    exit 1
fi
echo -e "${GREEN}✓ 目录正确${NC}"
echo ""

# 2. 备份配置
echo "步骤 2/8: 备份配置文件..."
if [ -f "gunicorn_config.py" ]; then
    cp gunicorn_config.py gunicorn_config.py.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ 配置已备份${NC}"
else
    echo -e "${YELLOW}⚠ gunicorn_config.py 不存在${NC}"
fi
echo ""

# 3. 查看当前状态
echo "步骤 3/8: 查看当前状态..."
echo "当前分支："
git branch | grep '*'
echo "最新提交："
git log --oneline -1
echo ""

# 4. 拉取代码
echo "步骤 4/8: 拉取最新代码..."
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠ main 分支拉取失败，尝试 master 分支...${NC}"
    git pull origin master
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ 拉取失败${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 代码已更新${NC}"
echo ""

# 5. 检查并修复配置
echo "步骤 5/8: 检查配置文件..."
if [ -f "gunicorn_config.py" ]; then
    CURRENT_BIND=$(grep "^bind" gunicorn_config.py | grep -o '"[^"]*"')
    echo "当前配置：bind = $CURRENT_BIND"
    
    if echo "$CURRENT_BIND" | grep -q "127.0.0.1"; then
        echo -e "${YELLOW}⚠ 配置被覆盖，正在修复...${NC}"
        sed -i 's/127.0.0.1:5000/0.0.0.0:5000/g' gunicorn_config.py
        echo -e "${GREEN}✓ 配置已修复为：bind = \"0.0.0.0:5000\"${NC}"
    else
        echo -e "${GREEN}✓ 配置正常${NC}"
    fi
else
    echo -e "${RED}✗ gunicorn_config.py 不存在${NC}"
fi
echo ""

# 6. 验证更新的文件
echo "步骤 6/8: 验证更新的文件..."
echo "最新提交的文件："
git show --name-only --oneline HEAD | tail -n +2
echo ""

# 7. 重启服务
echo "步骤 7/8: 重启 Gunicorn 服务..."
sudo systemctl restart gunicorn
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 服务重启成功${NC}"
    sleep 3
else
    echo -e "${RED}✗ 服务重启失败${NC}"
    echo "请查看日志：sudo journalctl -u gunicorn -n 50"
    exit 1
fi
echo ""

# 8. 验证服务状态
echo "步骤 8/8: 验证服务状态..."

# 检查服务状态
SERVICE_STATUS=$(sudo systemctl is-active gunicorn)
if [ "$SERVICE_STATUS" = "active" ]; then
    echo -e "${GREEN}✓ Gunicorn 服务运行中${NC}"
else
    echo -e "${RED}✗ Gunicorn 服务未运行${NC}"
    sudo systemctl status gunicorn
    exit 1
fi

# 检查端口监听
if netstat -tlnp 2>/dev/null | grep -q ":5000"; then
    echo -e "${GREEN}✓ 端口 5000 正在监听${NC}"
    netstat -tlnp | grep ":5000"
else
    echo -e "${RED}✗ 端口 5000 未监听${NC}"
fi

# 测试本地访问
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 本地访问正常 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${YELLOW}⚠ 本地访问返回 HTTP $HTTP_CODE${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}更新完成！${NC}"
echo "========================================"
echo ""
echo "后续步骤："
echo "1. 清除浏览器缓存（Ctrl+Shift+Delete）"
echo "2. 访问网站测试功能八"
echo "3. 测试新功能："
echo "   - 图片高清显示"
echo "   - 鼠标滚轮缩放"
echo "   - +/- 按钮缩放"
echo "   - 弹窗查看"
echo "   - 标注框清晰度"
echo ""
echo "如有问题，查看日志："
echo "  sudo journalctl -u gunicorn -f"
echo ""
