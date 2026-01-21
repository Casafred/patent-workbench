# 从 Render 迁移到阿里云完整指南

## 📋 迁移前准备

### 1. 购买阿里云 ECS

**推荐配置（日均10用户）：**
- 实例规格：1核2G（ecs.t6-c1m2.large）
- 操作系统：Ubuntu 22.04 LTS
- 带宽：按量付费 1-3Mbps
- 存储：20GB 系统盘
- 地域：选择离用户最近的（如华东、华北）

**购买链接：** https://ecs-buy.aliyun.com/

**费用：** 约 ¥60/月（按量付费测试后可转包年包月更便宜）

### 2. 配置安全组

在阿里云控制台配置以下端口：

```
入方向规则：
- 22/TCP    (SSH登录)
- 80/TCP    (HTTP)
- 443/TCP   (HTTPS)
- 5432/TCP  (PostgreSQL，仅内网)
```

---

## 🔧 第二步：服务器初始化（10分钟）

### 1. SSH 登录服务器

```bash
# Windows 用 PowerShell 或 PuTTY
ssh root@你的服务器IP
```

### 2. 更新系统

```bash
apt update && apt upgrade -y
```

### 3. 安装必要软件

```bash
# Python 3.11
apt install -y python3.11 python3.11-venv python3-pip

# PostgreSQL
apt install -y postgresql postgresql-contrib

# Nginx
apt install -y nginx

# Git
apt install -y git

# 其他工具
apt install -y curl wget vim
```

---

## 📦 第三步：部署应用（15分钟）

### 1. 创建应用目录

```bash
# 创建用户
useradd -m -s /bin/bash appuser

# 切换到应用用户
su - appuser

# 创建项目目录
mkdir -p ~/patent-app
cd ~/patent-app
```

### 2. 克隆代码

```bash
# 从 GitHub 克隆（替换为你的仓库地址）
git clone https://github.com/你的用户名/你的仓库.git .

# 或者从本地上传（在本地执行）
# scp -r . appuser@服务器IP:~/patent-app/
```

### 3. 创建虚拟环境

```bash
python3.11 -m venv venv
source venv/bin/activate
```

### 4. 安装依赖

```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn
```

### 5. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << 'EOF'
# Flask 配置
FLASK_SECRET_KEY=你的随机密钥-至少32位
PORT=5001

# 数据库配置
DATABASE_URL=postgresql://patent_user:你的数据库密码@localhost/patent_db

# API 配置（如果用到智谱AI）
ZHIPUAI_API_KEY=你的API密钥

# 其他配置
MAX_IPS_PER_USER=5
EOF

# 生成随机密钥
python3 -c "import secrets; print(secrets.token_hex(32))"
# 把生成的密钥填入上面的 FLASK_SECRET_KEY
```

---

## 🗄️ 第四步：配置数据库（5分钟）

### 1. 创建数据库和用户

```bash
# 切换回 root
exit

# 切换到 postgres 用户
sudo -u postgres psql

# 在 PostgreSQL 中执行
CREATE DATABASE patent_db;
CREATE USER patent_user WITH PASSWORD '你的数据库密码';
GRANT ALL PRIVILEGES ON DATABASE patent_db TO patent_user;
\q
```

### 2. 初始化数据库

```bash
# 切换回应用用户
su - appuser
cd ~/patent-app
source venv/bin/activate

# 运行初始化脚本
python backend/user_management/init_users.py
```

---

## 🚀 第五步：配置 Gunicorn（5分钟）

### 1. 创建 Gunicorn 配置

```bash
cat > gunicorn_config.py << 'EOF'
import multiprocessing

# 服务器配置
bind = "127.0.0.1:5001"
workers = 2  # 1核建议2个worker
threads = 2
worker_class = "sync"
timeout = 120

# 日志配置
accesslog = "/home/appuser/patent-app/logs/access.log"
errorlog = "/home/appuser/patent-app/logs/error.log"
loglevel = "info"

# 进程命名
proc_name = "patent-app"

# 优雅重启
graceful_timeout = 30
EOF

# 创建日志目录
mkdir -p logs
```

### 2. 创建 Systemd 服务

```bash
# 切换回 root
exit

# 创建服务文件
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

# 启动服务
systemctl daemon-reload
systemctl enable patent-app
systemctl start patent-app

# 检查状态
systemctl status patent-app
```

---

## 🌐 第六步：配置 Nginx（5分钟）

### 1. 创建 Nginx 配置

```bash
cat > /etc/nginx/sites-available/patent-app << 'EOF'
server {
    listen 80;
    server_name 你的域名或IP;

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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置（专利抓取可能较慢）
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # 日志
    access_log /var/log/nginx/patent-app-access.log;
    error_log /var/log/nginx/patent-app-error.log;
}
EOF

# 启用站点
ln -s /etc/nginx/sites-available/patent-app /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # 删除默认站点

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 2. 配置 HTTPS（可选但推荐）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书（需要域名）
certbot --nginx -d 你的域名

# 自动续期
systemctl enable certbot.timer
```

---

## ✅ 第七步：验证部署（5分钟）

### 1. 检查服务状态

```bash
# 检查应用
systemctl status patent-app

# 检查 Nginx
systemctl status nginx

# 检查数据库
systemctl status postgresql

# 查看应用日志
tail -f /home/appuser/patent-app/logs/error.log
```

### 2. 测试访问

```bash
# 本地测试
curl http://localhost

# 远程测试（在本地浏览器）
http://你的服务器IP
```

### 3. 测试功能

- 登录功能
- Excel 上传
- 专利查询
- 权利要求处理

---

## 🔄 第八步：数据迁移（如果需要）

### 从 Render 导出数据

```bash
# 在 Render 控制台执行
pg_dump $DATABASE_URL > backup.sql

# 下载到本地
# 然后上传到阿里云
```

### 导入到阿里云

```bash
# 在阿里云服务器执行
sudo -u postgres psql patent_db < backup.sql
```

---

## 📊 性能优化建议

### 1. 启用 Gzip 压缩

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1000;
```

### 2. 配置日志轮转

```bash
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
```

### 3. 设置定时清理临时文件

```bash
# 添加到 crontab
crontab -e

# 每天凌晨3点清理7天前的上传文件
0 3 * * * find /home/appuser/patent-app/uploads -type f -mtime +7 -delete
```

---

## 🛡️ 安全加固

### 1. 配置防火墙

```bash
# 安装 UFW
apt install -y ufw

# 配置规则
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. 禁用 root SSH 登录

```bash
# 编辑 SSH 配置
vim /etc/ssh/sshd_config

# 修改以下行
PermitRootLogin no
PasswordAuthentication no  # 强制使用密钥登录

# 重启 SSH
systemctl restart sshd
```

### 3. 配置自动更新

```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

---

## 🔧 日常维护命令

```bash
# 重启应用
systemctl restart patent-app

# 查看日志
journalctl -u patent-app -f

# 更新代码
cd ~/patent-app
git pull
systemctl restart patent-app

# 数据库备份
sudo -u postgres pg_dump patent_db > backup_$(date +%Y%m%d).sql

# 查看资源使用
htop
df -h
free -h
```

---

## 📞 故障排查

### 应用无法启动

```bash
# 查看详细日志
journalctl -u patent-app -n 50

# 检查端口占用
netstat -tlnp | grep 5001

# 手动启动测试
cd ~/patent-app
source venv/bin/activate
gunicorn --config gunicorn_config.py wsgi:app
```

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
systemctl status postgresql

# 测试连接
psql -U patent_user -d patent_db -h localhost
```

### Nginx 502 错误

```bash
# 检查应用是否运行
systemctl status patent-app

# 检查 Nginx 配置
nginx -t

# 查看 Nginx 错误日志
tail -f /var/log/nginx/error.log
```

---

## 💡 成本对比

| 项目 | Render 免费版 | Render 付费版 | 阿里云 1核2G |
|------|--------------|--------------|-------------|
| 月费用 | ¥0 | $7 (¥50) | ¥60 |
| 性能 | 512MB | 1GB | 2GB |
| 休眠 | 15分钟无活动休眠 | 不休眠 | 不休眠 |
| 带宽 | 限制 | 100GB | 按量 |
| 数据库 | 90天删除 | 持久化 | 持久化 |
| 自定义域名 | 支持 | 支持 | 支持 |

**结论：** 阿里云 1核2G 性价比最高，性能更好，无休眠问题。

---

## 🎯 迁移检查清单

- [ ] 购买阿里云 ECS 并配置安全组
- [ ] 安装系统软件（Python、PostgreSQL、Nginx）
- [ ] 克隆代码并安装依赖
- [ ] 配置环境变量（.env）
- [ ] 创建数据库和用户
- [ ] 初始化用户数据
- [ ] 配置 Gunicorn 服务
- [ ] 配置 Nginx 反向代理
- [ ] 配置 HTTPS 证书（可选）
- [ ] 测试所有功能
- [ ] 配置日志轮转和定时任务
- [ ] 安全加固（防火墙、SSH）
- [ ] 设置监控和告警

---

## 📚 相关文档

- [阿里云 ECS 文档](https://help.aliyun.com/product/25365.html)
- [Flask 部署指南](https://flask.palletsprojects.com/en/latest/deploying/)
- [Gunicorn 文档](https://docs.gunicorn.org/)
- [Nginx 文档](https://nginx.org/en/docs/)

---

**预计总耗时：** 约 1 小时
**难度：** 中等（需要基本的 Linux 命令行知识）
**建议：** 先在测试环境练习一遍，熟悉流程后再正式迁移
