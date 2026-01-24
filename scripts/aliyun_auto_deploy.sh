#!/bin/bash
# 阿里云ECS自动部署脚本（¥99/年版）
# 使用方法：在服务器上运行 bash aliyun_auto_deploy.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  专利分析工作台 - 阿里云自动部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}错误：请使用 root 用户运行此脚本${NC}"
    echo "运行：sudo bash aliyun_auto_deploy.sh"
    exit 1
fi

echo -e "${GREEN}✓ 检查通过：root 权限${NC}"
echo ""

# 步骤1：更新系统
echo "=========================================="
echo "步骤 1/10：更新系统软件包"
echo "=========================================="
apt update
apt upgrade -y
echo -e "${GREEN}✓ 系统更新完成${NC}"
echo ""

# 步骤2：安装Python 3.11
echo "=========================================="
echo "步骤 2/10：安装 Python 3.11"
echo "=========================================="
apt install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt update
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
echo -e "${GREEN}✓ Python 3.11 安装完成${NC}"
python3.11 --version
echo ""

# 步骤3：安装PostgreSQL
echo "=========================================="
echo "步骤 3/10：安装 PostgreSQL"
echo "=========================================="
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
echo -e "${GREEN}✓ PostgreSQL 安装完成${NC}"
echo ""

# 步骤4：安装Nginx
echo "=========================================="
echo "步骤 4/10：安装 Nginx"
echo "=========================================="
apt install -y nginx
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx 安装完成${NC}"
echo ""

# 步骤5：安装其他工具
echo "=========================================="
echo "步骤 5/10：安装其他必要工具"
echo "=========================================="
apt install -y git curl wget vim htop
echo -e "${GREEN}✓ 工具安装完成${NC}"
echo ""

# 步骤6：创建应用用户
echo "=========================================="
echo "步骤 6/10：创建应用用户"
echo "=========================================="
if id "appuser" &>/dev/null; then
    echo -e "${YELLOW}用户 appuser 已存在，跳过创建${NC}"
else
    useradd -m -s /bin/bash appuser
    echo -e "${GREEN}✓ 用户 appuser 创建完成${NC}"
fi
echo ""

# 步骤7：克隆代码
echo "=========================================="
echo "步骤 7/10：克隆代码仓库"
echo "=========================================="
echo -e "${YELLOW}请输入你的 GitHub 仓库地址（例如：https://github.com/username/repo.git）：${NC}"
read -p "仓库地址: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo -e "${RED}错误：仓库地址不能为空${NC}"
    exit 1
fi

# 切换到appuser并克隆代码
su - appuser -c "
    if [ -d ~/patent-app ]; then
        echo '目录已存在，删除旧目录...'
        rm -rf ~/patent-app
    fi
    git clone $REPO_URL ~/patent-app
"
echo -e "${GREEN}✓ 代码克隆完成${NC}"
echo ""

# 步骤8：安装Python依赖
echo "=========================================="
echo "步骤 8/10：安装 Python 依赖"
echo "=========================================="
su - appuser -c "
    cd ~/patent-app
    python3.11 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    pip install gunicorn
"
echo -e "${GREEN}✓ Python 依赖安装完成${NC}"
echo ""

# 步骤9：配置数据库
echo "=========================================="
echo "步骤 9/10：配置数据库"
echo "=========================================="
echo -e "${YELLOW}请设置数据库密码（建议使用强密码）：${NC}"
read -sp "数据库密码: " DB_PASSWORD
echo ""

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE DATABASE patent_db;
CREATE USER patent_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE patent_db TO patent_user;
\q
EOF
echo -e "${GREEN}✓ 数据库配置完成${NC}"
echo ""

# 步骤10：配置环境变量
echo "=========================================="
echo "步骤 10/10：配置环境变量"
echo "=========================================="
echo -e "${YELLOW}请输入你的智谱AI API密钥（如果没有可以按回车跳过）：${NC}"
read -p "API密钥: " API_KEY

# 生成随机密钥
FLASK_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# 创建.env文件
su - appuser -c "cat > ~/patent-app/.env << 'ENVEOF'
# Flask 配置
FLASK_SECRET_KEY=$FLASK_SECRET
PORT=5001

# 数据库配置
DATABASE_URL=postgresql://patent_user:$DB_PASSWORD@localhost/patent_db

# API 配置
ZHIPUAI_API_KEY=$API_KEY

# 其他配置
MAX_IPS_PER_USER=5
ENVEOF
"
echo -e "${GREEN}✓ 环境变量配置完成${NC}"
echo ""

# 初始化数据库
echo "=========================================="
echo "初始化用户数据"
echo "=========================================="
su - appuser -c "
    cd ~/patent-app
    source venv/bin/activate
    python backend/user_management/init_users.py
"
echo -e "${GREEN}✓ 用户数据初始化完成${NC}"
echo ""

# 创建日志目录
su - appuser -c "mkdir -p ~/patent-app/logs"

# 配置Gunicorn
echo "=========================================="
echo "配置 Gunicorn"
echo "=========================================="
su - appuser -c "cat > ~/patent-app/gunicorn_config.py << 'GUNICORNEOF'
import multiprocessing

# 服务器配置
bind = '127.0.0.1:5001'
workers = 2
threads = 2
worker_class = 'sync'
timeout = 120

# 日志配置
accesslog = '/home/appuser/patent-app/logs/access.log'
errorlog = '/home/appuser/patent-app/logs/error.log'
loglevel = 'info'

# 进程命名
proc_name = 'patent-app'

# 优雅重启
graceful_timeout = 30
GUNICORNEOF
"
echo -e "${GREEN}✓ Gunicorn 配置完成${NC}"
echo ""

# 创建Systemd服务
echo "=========================================="
echo "配置 Systemd 服务"
echo "=========================================="
cat > /etc/systemd/system/patent-app.service << 'SERVICEEOF'
[Unit]
Description=Patent Analysis Workbench
After=network.target postgresql.service

[Service]
Type=notify
User=appuser
Group=appuser
WorkingDirectory=/home/appuser/patent-app
Environment="PATH=/home/appuser/patent-app/venv/bin"
ExecStart=/home/appuser/patent-app/venv/bin/gunicorn \
    --config gunicorn_config.py \
    wsgi:app
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always

[Install]
WantedBy=multi-user.target
SERVICEEOF

systemctl daemon-reload
systemctl enable patent-app
systemctl start patent-app
echo -e "${GREEN}✓ Systemd 服务配置完成${NC}"
echo ""

# 配置Nginx
echo "=========================================="
echo "配置 Nginx"
echo "=========================================="
SERVER_IP=$(curl -s ifconfig.me)
cat > /etc/nginx/sites-available/patent-app << NGINXEOF
server {
    listen 80;
    server_name $SERVER_IP;

    # 客户端上传大小限制
    client_max_body_size 16M;

    # 静态文件
    location /frontend/ {
        alias /home/appuser/patent-app/frontend/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /js/ {
        alias /home/appuser/patent-app/js/;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # API 请求
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # 超时设置
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # 日志
    access_log /var/log/nginx/patent-app-access.log;
    error_log /var/log/nginx/patent-app-error.log;
}
NGINXEOF

ln -sf /etc/nginx/sites-available/patent-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
echo -e "${GREEN}✓ Nginx 配置完成${NC}"
echo ""

# 配置防火墙
echo "=========================================="
echo "配置防火墙"
echo "=========================================="
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
echo -e "${GREEN}✓ 防火墙配置完成${NC}"
echo ""

# 最终检查
echo "=========================================="
echo "最终检查"
echo "=========================================="
echo "检查服务状态..."
systemctl status patent-app --no-pager | head -10
echo ""
systemctl status nginx --no-pager | head -10
echo ""

echo "=========================================="
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "=========================================="
echo ""
echo "访问地址："
echo -e "${GREEN}http://$SERVER_IP${NC}"
echo ""
echo "默认登录账号："
echo "  用户名: admin"
echo "  密码: admin123"
echo ""
echo "重要提示："
echo "1. 请立即修改默认密码"
echo "2. 如果无法访问，请检查阿里云安全组是否开放80端口"
echo "3. 查看日志：tail -f /home/appuser/patent-app/logs/error.log"
echo ""
echo "常用命令："
echo "  重启应用：systemctl restart patent-app"
echo "  查看日志：journalctl -u patent-app -f"
echo "  更新代码：cd /home/appuser/patent-app && git pull && systemctl restart patent-app"
echo ""
echo "=========================================="
