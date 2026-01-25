#!/bin/bash
# 专利应用服务诊断脚本
# 使用方法: chmod +x diagnose_service.sh && sudo ./diagnose_service.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "  Patent App Service 诊断工具"
echo "==========================================${NC}"
echo ""

APP_DIR="/home/appuser/patent-app"

# 1. 检查服务状态
echo -e "${YELLOW}[1/9] 检查服务状态...${NC}"
systemctl status patent-app.service --no-pager -l
echo ""

# 2. 查看最近的错误日志
echo -e "${YELLOW}[2/9] 查看 systemd 日志（最近30行）...${NC}"
journalctl -u patent-app.service -n 30 --no-pager
echo ""

# 3. 检查端口占用
echo -e "${YELLOW}[3/9] 检查端口 5001 占用情况...${NC}"
if netstat -tlnp | grep 5001; then
    echo -e "${RED}端口 5001 已被占用${NC}"
else
    echo -e "${GREEN}端口 5001 未被占用${NC}"
fi
echo ""

# 4. 检查应用目录和文件
echo -e "${YELLOW}[4/9] 检查应用目录...${NC}"
if [ -d "$APP_DIR" ]; then
    echo -e "${GREEN}应用目录存在: $APP_DIR${NC}"
    ls -la $APP_DIR | head -20
else
    echo -e "${RED}应用目录不存在: $APP_DIR${NC}"
fi
echo ""

# 5. 检查关键文件
echo -e "${YELLOW}[5/9] 检查关键文件...${NC}"
for file in "wsgi.py" "gunicorn_config.py" ".env" "requirements.txt" "venv/bin/gunicorn"; do
    if [ -e "$APP_DIR/$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (缺失)"
    fi
done
echo ""

# 6. 检查虚拟环境
echo -e "${YELLOW}[6/9] 检查 Python 虚拟环境...${NC}"
if [ -d "$APP_DIR/venv" ]; then
    echo -e "${GREEN}虚拟环境存在${NC}"
    echo "Python 版本:"
    $APP_DIR/venv/bin/python --version
    echo ""
    echo "已安装包（主要依赖）:"
    $APP_DIR/venv/bin/pip list | grep -E "Flask|gunicorn|psycopg2"
else
    echo -e "${RED}虚拟环境不存在${NC}"
fi
echo ""

# 7. 检查环境变量文件
echo -e "${YELLOW}[7/9] 检查 .env 文件...${NC}"
if [ -f "$APP_DIR/.env" ]; then
    echo -e "${GREEN}.env 文件存在${NC}"
    echo "环境变量（隐藏敏感信息）:"
    cat $APP_DIR/.env | sed 's/=.*/=***/'
else
    echo -e "${RED}.env 文件不存在${NC}"
fi
echo ""

# 8. 测试 Python 导入
echo -e "${YELLOW}[8/9] 测试 Python 应用导入...${NC}"
cd $APP_DIR
sudo -u appuser bash -c "source venv/bin/activate && python3 -c 'from wsgi import app; print(\"✓ wsgi.py 导入成功\")'" 2>&1
echo ""

# 9. 检查日志文件
echo -e "${YELLOW}[9/9] 检查应用日志...${NC}"
if [ -d "$APP_DIR/logs" ]; then
    echo -e "${GREEN}日志目录存在${NC}"
    echo "日志文件:"
    ls -lh $APP_DIR/logs/
    echo ""
    if [ -f "$APP_DIR/logs/error.log" ]; then
        echo "最近的错误日志（最后20行）:"
        tail -20 $APP_DIR/logs/error.log
    else
        echo "error.log 文件不存在"
    fi
else
    echo -e "${RED}日志目录不存在${NC}"
fi
echo ""

# 10. 检查权限
echo -e "${YELLOW}[10/10] 检查文件权限...${NC}"
ls -ld $APP_DIR
ls -l $APP_DIR/.env 2>/dev/null
ls -ld $APP_DIR/logs 2>/dev/null
echo ""

# 总结
echo -e "${BLUE}=========================================="
echo "  诊断完成"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}建议的操作：${NC}"
echo "1. 如果看到具体错误，根据错误信息修复"
echo "2. 如果端口被占用，运行: kill -9 <PID>"
echo "3. 如果缺少文件，重新部署或创建文件"
echo "4. 如果 Python 导入失败，检查依赖: pip install -r requirements.txt"
echo "5. 如果权限问题，运行: chown -R appuser:appuser $APP_DIR"
echo ""
echo -e "${YELLOW}修复后重启服务：${NC}"
echo "systemctl daemon-reload"
echo "systemctl restart patent-app"
echo "systemctl status patent-app"
