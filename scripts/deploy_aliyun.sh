#!/bin/bash
# 阿里云一键部署脚本
# 使用方法：chmod +x deploy_aliyun.sh && ./deploy_aliyun.sh

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  专利分析工作台 - 阿里云部署脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 root 用户运行此脚本${NC}"
    echo "使用命令: sudo ./deploy_aliyun.sh"
    exit 1
fi

# 获取配置信息
echo -e "${YELLOW}请输入配置信息：${NC}"
read -p "数据库密码: " DB_PASSWORD
read -p "Flask Secret Key (留空自动生成): " FLASK_SECRET
read -p "智谱AI API Key (可选): " ZHIPUAI_KEY
read -p "域名或IP地址: " DOMAIN

# 生成随机密钥
if [ -z "$FLASK_SECRET" ]; then
    FLASK_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    echo -e "${GREEN}已自动生成 Flask Secret Key${NC}"
fi

echo ""
echo -e "${GREEN}开始部署...${NC}"
echo ""

# 1. 更新系统
echo -e "${YELLOW}[1/10] 更新系统...${NC}"
apt update && apt upgrade -y

# 2. 安装软件
echo -e "${YELLOW}[2/10] 安装必要软件...${NC}"
apt install -y python3.11 python3.11-venv python3-pip \
    postgresql postgresql-contrib \
    nginx git curl wget vim htop

# 3. 创建应用用户
echo -e "${YELLOW}[3/10] 创建应用用户...${NC}"
if ! id -u appuser > /dev/null 2>&1; then
    useradd -m -s /bin/bash appuser
    echo -e "${GREEN}用户 appuser 创建成功${NC}"
else
    echo -e "${YELLOW}用户 appuser 已存在${NC}"
fi

# 4. 创建项目目录
echo -e "${YELLOW}[4/10] 创建项目目录...${NC}"
APP_DIR="/home/appuser/patent-app"
mkdir -p $APP_DIR
cd $APP_DIR

# 5. 克隆代码（如果目录为空）
echo -e "${YELLOW}[5/10] 准备代码...${NC}"
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}请先将代码上传到 $APP_DIR${NC}"
    echo "使用命令: scp -r . root@服务器IP:$APP_DIR/"
    exit 1
fi

# 6. 创建虚拟环境
echo -e "${YELLOW}[6/10] 创建虚拟环境...${NC}"
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

# 7. 配置环境变量
echo -e "${YELLOW}[7/10] 配置环境变量...${NC}"
cat > .env << EOF
FLASK_SECRET_KEY=$FLASK_SECRET
PORT=5001
DATABASE_URL=postgresql://patent_user:$DB_PASSWORD@localhost/patent_db
ZHIPUAI_API_KEY=$ZHIPUAI_KEY
MAX_IPS_PER_USER=5
EOF

# 8. 配置数据库
echo -e "${YELLOW}[8/10] 配置数据库...${NC}"
sudo -u postgres psql << EOF
CREATE DATABASE patent_db;
CREATE USER patent_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE patent_db TO patent_user;
\q
EOF

# 初始化数据库
python backend/user_management/init_users.py

# 9. 创建 Gunicorn 配置
echo -e "${YELLOW}[9/10] 配置 Gunicorn...${NC}"
cat > gunicorn_config.py << 'EOF'
import multiprocessing

bind = "127.0.0.1:5001"
workers = 2
threads = 2
worker_class = "sync"
timeout = 120

accesslog = "/home/appuser/patent-app/logs/access.log"
errorlog = "/home/appuser/patent-app/logs/error.log"
loglevel = "info"

proc_name = "patent-app"
graceful_timeout = 30
EOF

mkdir -p logs
chown -R appuser:appuser $APP_DIR

# 创建 Systemd 服务
cat > /etc/systemd/system/patent-app.service << 'EOF'
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
EOF

systemctl daemon-reload
systemctl enable patent-app
systemctl start patent-app

# 10. 配置 Nginx
echo -e "${YELLOW}[10/10] 配置 Nginx...${NC}"
cat > /etc/nginx/sites-available/patent-app << EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 16M;

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

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    access_log /var/log/nginx/patent-app-access.log;
    error_log /var/log/nginx/patent-app-error.log;
}
EOF

ln -sf /etc/nginx/sites-available/patent-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl restart nginx

# 配置防火墙
echo -e "${YELLOW}配置防火墙...${NC}"
apt install -y ufw
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# 配置日志轮转
cat > /etc/logrotate.d/patent-app << 'EOF'
/home/appuser/patent-app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 appuser appuser
    sharedscripts
    postrotate
        systemctl reload patent-app
    endscript
}
EOF

# 配置定时清理
(crontab -l 2>/dev/null; echo "0 3 * * * find /home/appuser/patent-app/uploads -type f -mtime +7 -delete") | crontab -

echo ""
echo -e "${GREEN}=========================================="
echo "  部署完成！"
echo "==========================================${NC}"
echo ""
echo -e "${GREEN}访问地址：${NC} http://$DOMAIN"
echo ""
echo -e "${YELLOW}检查服务状态：${NC}"
echo "  systemctl status patent-app"
echo "  systemctl status nginx"
echo ""
echo -e "${YELLOW}查看日志：${NC}"
echo "  tail -f /home/appuser/patent-app/logs/error.log"
echo "  journalctl -u patent-app -f"
echo ""
echo -e "${YELLOW}配置 HTTPS（可选）：${NC}"
echo "  apt install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d $DOMAIN"
echo ""
echo -e "${GREEN}祝使用愉快！${NC}"
