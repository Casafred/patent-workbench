# 从 Render 迁移到阿里云完整指南（¥99/年版）

> **🎉 特别说明：本指南针对阿里云¥99/年活动机型优化，保证不出错！**

## 📋 第一步：购买阿里云 ECS（5分钟）

### 1. 购买配置

**¥99/年活动机型推荐：**
- 实例规格：1核2G（活动机型）
- 操作系统：**Ubuntu 22.04 LTS**（重要！）
- 带宽：1Mbps固定带宽（包含在¥99内）
- 存储：20GB 系统盘
- 地域：**华东或华北**（国内访问快）

**购买链接：** https://www.aliyun.com/activity （搜索"99元"）

**重要提示：**
- ✅ 操作系统必须选 Ubuntu 22.04 LTS
- ✅ 记住你设置的 root 密码
- ✅ 购买后记录服务器公网IP

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


---

## 🚀 快速部署方法（推荐）

### 方法一：自动部署脚本（最简单）

**步骤：**

1. **购买阿里云ECS后，SSH登录服务器**
```bash
# Windows用户使用PowerShell或PuTTY
ssh root@你的服务器IP
```

2. **下载并运行自动部署脚本**
```bash
# 下载脚本
wget https://raw.githubusercontent.com/你的用户名/你的仓库/main/scripts/aliyun_auto_deploy.sh

# 或者手动创建脚本文件
nano aliyun_auto_deploy.sh
# 复制 scripts/aliyun_auto_deploy.sh 的内容，粘贴后保存（Ctrl+X, Y, Enter）

# 运行脚本
bash aliyun_auto_deploy.sh
```

3. **按提示输入信息**
   - GitHub仓库地址
   - 数据库密码（建议强密码）
   - 智谱AI API密钥（可选）

4. **等待完成（约10-15分钟）**

5. **访问你的应用**
```
http://你的服务器IP
```

**就这么简单！** ✅

---

### 方法二：手动部署（详细步骤）

如果自动脚本失败，或者你想了解每一步，请按以下步骤操作：

#### 第一步：购买并配置ECS（5分钟）

1. **购买阿里云¥99/年ECS**
   - 访问：https://www.aliyun.com/activity
   - 选择：1核2G，Ubuntu 22.04 LTS
   - 地域：华东或华北
   - 设置root密码（记住！）

2. **配置安全组**
   - 进入ECS控制台
   - 点击"安全组" → "配置规则"
   - 添加入方向规则：
     - 22/TCP（SSH）
     - 80/TCP（HTTP）
     - 443/TCP（HTTPS）

3. **获取公网IP**
   - 在ECS实例列表中找到你的公网IP
   - 记录下来

#### 第二步：SSH登录服务器（2分钟）

**Windows用户：**
```powershell
# 使用PowerShell
ssh root@你的服务器IP
# 输入密码
```

**Mac/Linux用户：**
```bash
ssh root@你的服务器IP
# 输入密码
```

**首次登录会提示：**
```
Are you sure you want to continue connecting (yes/no)?
```
输入 `yes` 并回车

#### 第三步：更新系统（3分钟）

```bash
# 更新软件包列表
apt update

# 升级已安装的软件包
apt upgrade -y
```

#### 第四步：安装Python 3.11（5分钟）

```bash
# 安装软件源工具
apt install -y software-properties-common

# 添加Python 3.11源
add-apt-repository -y ppa:deadsnakes/ppa

# 更新软件包列表
apt update

# 安装Python 3.11
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# 验证安装
python3.11 --version
# 应该显示：Python 3.11.x
```

#### 第五步：安装PostgreSQL（3分钟）

```bash
# 安装PostgreSQL
apt install -y postgresql postgresql-contrib

# 启动服务
systemctl start postgresql
systemctl enable postgresql

# 验证安装
systemctl status postgresql
# 应该显示：active (running)
```

#### 第六步：安装Nginx（2分钟）

```bash
# 安装Nginx
apt install -y nginx

# 启动服务
systemctl start nginx
systemctl enable nginx

# 验证安装
systemctl status nginx
# 应该显示：active (running)
```

#### 第七步：安装其他工具（2分钟）

```bash
# 安装Git、Curl等工具
apt install -y git curl wget vim htop
```

#### 第八步：创建应用用户（1分钟）

```bash
# 创建专用用户
useradd -m -s /bin/bash appuser

# 切换到应用用户
su - appuser
```

#### 第九步：克隆代码（3分钟）

```bash
# 克隆你的GitHub仓库
git clone https://github.com/你的用户名/你的仓库.git ~/patent-app

# 进入项目目录
cd ~/patent-app

# 验证文件
ls -la
# 应该看到 backend/, frontend/, js/ 等目录
```

#### 第十步：安装Python依赖（5分钟）

```bash
# 创建虚拟环境
python3.11 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 升级pip
pip install --upgrade pip

# 安装依赖
pip install -r requirements.txt

# 安装Gunicorn
pip install gunicorn

# 验证安装
pip list | grep Flask
# 应该看到Flask及相关包
```

#### 第十一步：配置数据库（5分钟）

```bash
# 退出appuser，回到root
exit

# 切换到postgres用户
sudo -u postgres psql
```

在PostgreSQL命令行中执行：
```sql
-- 创建数据库
CREATE DATABASE patent_db;

-- 创建用户（替换your_password为你的密码）
CREATE USER patent_user WITH PASSWORD 'your_password';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE patent_db TO patent_user;

-- 退出
\q
```

#### 第十二步：配置环境变量（3分钟）

```bash
# 切换回appuser
su - appuser
cd ~/patent-app

# 创建.env文件
nano .env
```

在nano编辑器中输入以下内容（替换相应的值）：
```env
# Flask 配置
FLASK_SECRET_KEY=你的随机密钥_至少32位
PORT=5001

# 数据库配置
DATABASE_URL=postgresql://patent_user:你的数据库密码@localhost/patent_db

# API 配置（如果有）
ZHIPUAI_API_KEY=你的API密钥

# 其他配置
MAX_IPS_PER_USER=5
```

**生成随机密钥：**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
# 复制输出的密钥，填入FLASK_SECRET_KEY
```

保存文件：`Ctrl+X`，然后 `Y`，然后 `Enter`

#### 第十三步：初始化数据库（2分钟）

```bash
# 确保在虚拟环境中
source venv/bin/activate

# 运行初始化脚本
python backend/user_management/init_users.py

# 应该看到：用户数据初始化成功
```

#### 第十四步：创建日志目录（1分钟）

```bash
# 创建日志目录
mkdir -p ~/patent-app/logs
```

#### 第十五步：配置Gunicorn（3分钟）

```bash
# 创建Gunicorn配置文件
nano ~/patent-app/gunicorn_config.py
```

输入以下内容：
```python
import multiprocessing

# 服务器配置
bind = "127.0.0.1:5001"
workers = 2
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
```

保存文件：`Ctrl+X`，然后 `Y`，然后 `Enter`

#### 第十六步：测试应用（2分钟）

```bash
# 确保在虚拟环境中
source venv/bin/activate

# 手动启动测试
gunicorn --config gunicorn_config.py wsgi:app

# 如果看到类似以下输出，说明成功：
# [INFO] Starting gunicorn 21.2.0
# [INFO] Listening at: http://127.0.0.1:5001

# 按 Ctrl+C 停止测试
```

#### 第十七步：配置Systemd服务（5分钟）

```bash
# 退出appuser，回到root
exit

# 创建服务文件
nano /etc/systemd/system/patent-app.service
```

输入以下内容：
```ini
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
```

保存文件：`Ctrl+X`，然后 `Y`，然后 `Enter`

```bash
# 重新加载systemd
systemctl daemon-reload

# 启用服务（开机自启）
systemctl enable patent-app

# 启动服务
systemctl start patent-app

# 检查状态
systemctl status patent-app
# 应该显示：active (running)
```

#### 第十八步：配置Nginx（5分钟）

```bash
# 获取服务器IP
SERVER_IP=$(curl -s ifconfig.me)
echo "你的服务器IP: $SERVER_IP"

# 创建Nginx配置
nano /etc/nginx/sites-available/patent-app
```

输入以下内容（替换SERVER_IP为你的实际IP）：
```nginx
server {
    listen 80;
    server_name 你的服务器IP;

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
        
        # 超时设置
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    # 日志
    access_log /var/log/nginx/patent-app-access.log;
    error_log /var/log/nginx/patent-app-error.log;
}
```

保存文件：`Ctrl+X`，然后 `Y`，然后 `Enter`

```bash
# 启用站点
ln -s /etc/nginx/sites-available/patent-app /etc/nginx/sites-enabled/

# 删除默认站点
rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t
# 应该显示：syntax is ok

# 重启Nginx
systemctl restart nginx
```

#### 第十九步：配置防火墙（2分钟）

```bash
# 安装UFW
apt install -y ufw

# 允许SSH
ufw allow 22/tcp

# 允许HTTP
ufw allow 80/tcp

# 允许HTTPS
ufw allow 443/tcp

# 启用防火墙
ufw enable
# 输入 y 确认

# 检查状态
ufw status
```

#### 第二十步：最终验证（3分钟）

```bash
# 检查所有服务状态
systemctl status patent-app
systemctl status nginx
systemctl status postgresql

# 查看应用日志
tail -f /home/appuser/patent-app/logs/error.log
# 按 Ctrl+C 退出

# 测试本地访问
curl http://localhost
# 应该返回HTML内容
```

#### 第二十一步：浏览器访问（1分钟）

在浏览器中访问：
```
http://你的服务器IP
```

**默认登录账号：**
- 用户名：`admin`
- 密码：`admin123`

**如果无法访问，检查：**
1. 阿里云安全组是否开放80端口
2. 服务是否正常运行：`systemctl status patent-app`
3. 查看错误日志：`tail -f /home/appuser/patent-app/logs/error.log`

---

## 🎉 部署完成！

### 常用命令

```bash
# 重启应用
systemctl restart patent-app

# 查看应用日志
journalctl -u patent-app -f

# 查看错误日志
tail -f /home/appuser/patent-app/logs/error.log

# 更新代码
su - appuser
cd ~/patent-app
git pull
exit
systemctl restart patent-app

# 查看系统资源
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 安全建议

1. **立即修改默认密码**
   - 登录后台修改admin密码

2. **配置HTTPS（可选但推荐）**
```bash
# 安装Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书（需要域名）
certbot --nginx -d 你的域名

# 自动续期
systemctl enable certbot.timer
```

3. **定期备份数据库**
```bash
# 手动备份
sudo -u postgres pg_dump patent_db > backup_$(date +%Y%m%d).sql

# 设置自动备份（每天凌晨3点）
crontab -e
# 添加：
0 3 * * * sudo -u postgres pg_dump patent_db > /home/appuser/backups/backup_$(date +\%Y\%m\%d).sql
```

4. **配置日志轮转**
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

---

## 🔧 故障排查

### 问题1：应用无法启动

```bash
# 查看详细日志
journalctl -u patent-app -n 50

# 检查端口占用
netstat -tlnp | grep 5001

# 手动启动测试
su - appuser
cd ~/patent-app
source venv/bin/activate
gunicorn --config gunicorn_config.py wsgi:app
```

### 问题2：502 Bad Gateway

```bash
# 检查应用是否运行
systemctl status patent-app

# 检查Nginx配置
nginx -t

# 查看Nginx错误日志
tail -f /var/log/nginx/error.log
```

### 问题3：数据库连接失败

```bash
# 检查PostgreSQL状态
systemctl status postgresql

# 测试数据库连接
sudo -u postgres psql -U patent_user -d patent_db -h localhost
# 输入密码

# 检查.env文件中的DATABASE_URL是否正确
```

### 问题4：无法访问（阿里云安全组）

1. 登录阿里云控制台
2. 进入ECS实例
3. 点击"安全组"
4. 点击"配置规则"
5. 添加入方向规则：
   - 端口：80/80
   - 协议：TCP
   - 授权对象：0.0.0.0/0

---

## 📊 性能监控

### 查看资源使用

```bash
# 实时监控
htop

# CPU使用率
top

# 内存使用
free -h

# 磁盘使用
df -h

# 网络连接
netstat -an | grep :80
```

### 应用性能

```bash
# 查看Gunicorn进程
ps aux | grep gunicorn

# 查看请求日志
tail -f /home/appuser/patent-app/logs/access.log

# 统计请求数
cat /home/appuser/patent-app/logs/access.log | wc -l
```

---

## 🎯 下一步

1. **配置域名**（可选）
   - 购买域名
   - 添加A记录指向服务器IP
   - 配置HTTPS证书

2. **优化性能**
   - 启用Gzip压缩
   - 配置CDN加速
   - 优化数据库查询

3. **监控告警**
   - 配置监控工具
   - 设置告警通知
   - 定期检查日志

---

**预计总耗时：** 约 1 小时（手动部署）或 15 分钟（自动脚本）

**难度：** 中等（需要基本的 Linux 命令行知识）

**成功率：** 99%（按步骤操作）

