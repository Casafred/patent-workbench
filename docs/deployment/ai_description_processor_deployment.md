# AI说明书处理器 - 部署指南

## 概述

本文档提供AI说明书处理器的完整部署流程，包括本地开发环境、Render云平台和阿里云ECS服务器的部署方法。

---

## 前置要求

### 系统要求

- **Python**: 3.8 或更高版本
- **操作系统**: Windows 10+, Linux (Ubuntu 20.04+), macOS 10.15+
- **内存**: 最低 512MB，推荐 1GB+
- **磁盘空间**: 最低 500MB

### 依赖包

核心依赖已包含在 `requirements.txt` 中:

```
langdetect>=1.0.9      # 语言检测
hypothesis>=6.0.0      # 属性测试（开发环境）
requests>=2.28.0       # HTTP请求
flask>=2.3.0           # Web框架
```

### API密钥

需要智谱AI的API密钥:
- 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
- 注册并创建API密钥
- 确保账户有足够余额

---

## 本地开发环境部署

### Windows

#### 方法1: 使用部署脚本（推荐）

```cmd
# 运行部署脚本
scripts\deploy_ai_description_processor.bat
```

脚本会自动:
1. 检查Python环境
2. 创建/激活虚拟环境
3. 安装依赖
4. 检查配置文件
5. 启动测试服务器

#### 方法2: 手动部署

```cmd
# 1. 创建虚拟环境
python -m venv venv
call venv\Scripts\activate.bat

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
copy .env.example .env
# 编辑 .env 文件，设置 ZHIPU_API_KEY

# 4. 启动服务
python run_app.py
```

#### 访问测试页面

打开浏览器访问: `http://localhost:5001/test_ai_description_processor.html`

### Linux/Mac

#### 方法1: 使用部署脚本（推荐）

```bash
# 添加执行权限
chmod +x scripts/deploy_ai_description_processor.sh

# 运行部署脚本
./scripts/deploy_ai_description_processor.sh
```

#### 方法2: 手动部署

```bash
# 1. 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 2. 安装依赖
pip3 install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置 ZHIPU_API_KEY

# 4. 启动服务
python3 run_app.py
```

---

## Render云平台部署

### 步骤1: 准备代码

确保代码已推送到GitHub仓库。

### 步骤2: 创建Web Service

1. 登录 [Render Dashboard](https://dashboard.render.com/)
2. 点击 "New +" → "Web Service"
3. 连接GitHub仓库
4. 配置服务:
   - **Name**: `patent-app` (或自定义)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -c gunicorn_config.py wsgi:app`

### 步骤3: 配置环境变量

在 Environment 标签中添加:

```
ZHIPU_API_KEY=your-actual-api-key-here
FLASK_SECRET_KEY=your-random-secret-key
PORT=5000
AI_REQUEST_TIMEOUT=60
AI_MAX_RETRIES=3
```

### 步骤4: 部署

点击 "Create Web Service"，Render会自动:
1. 克隆代码
2. 安装依赖
3. 启动服务

### 步骤5: 验证部署

访问: `https://your-app-name.onrender.com/test_ai_description_processor.html`

### Render部署注意事项

1. **免费套餐限制**:
   - 服务会在15分钟无活动后休眠
   - 首次请求可能需要30-60秒唤醒
   - 每月750小时免费运行时间

2. **性能优化**:
   - 使用付费套餐避免休眠
   - 配置健康检查保持服务活跃
   - 使用CDN加速静态资源

3. **日志查看**:
   - 在Render Dashboard的Logs标签查看实时日志
   - 使用 `print()` 输出调试信息

---

## 阿里云ECS部署

### 步骤1: 准备服务器

```bash
# 连接到服务器
ssh root@your-server-ip

# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Python和必要工具
sudo apt install -y python3 python3-pip python3-venv git nginx
```

### 步骤2: 克隆代码

```bash
# 创建应用目录
sudo mkdir -p /var/www/patent-app
cd /var/www/patent-app

# 克隆代码
sudo git clone https://github.com/your-username/your-repo.git .

# 设置权限
sudo chown -R www-data:www-data /var/www/patent-app
```

### 步骤3: 运行部署脚本

```bash
# 添加执行权限
chmod +x scripts/deploy_ai_description_processor.sh

# 运行部署脚本
sudo ./scripts/deploy_ai_description_processor.sh
```

### 步骤4: 配置systemd服务

创建服务文件 `/etc/systemd/system/patent-app.service`:

```ini
[Unit]
Description=Patent App with AI Description Processor
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/patent-app
Environment="PATH=/var/www/patent-app/venv/bin"
Environment="ZHIPU_API_KEY=your-actual-api-key-here"
Environment="FLASK_SECRET_KEY=your-random-secret-key"
Environment="PORT=5000"
ExecStart=/var/www/patent-app/venv/bin/gunicorn -c gunicorn_config.py wsgi:app
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

启动服务:

```bash
# 重载systemd配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start patent-app

# 设置开机自启
sudo systemctl enable patent-app

# 查看状态
sudo systemctl status patent-app
```

### 步骤5: 配置Nginx反向代理

创建Nginx配置 `/etc/nginx/sites-available/patent-app`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 静态文件
    location /frontend/ {
        alias /var/www/patent-app/frontend/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /test_ai_description_processor.html {
        alias /var/www/patent-app/test_ai_description_processor.html;
    }

    # API请求
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置（AI处理可能需要较长时间）
        proxy_connect_timeout 90s;
        proxy_send_timeout 90s;
        proxy_read_timeout 90s;
    }
}
```

启用配置:

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/patent-app /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 步骤6: 配置HTTPS（可选但推荐）

```bash
# 安装Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 步骤7: 验证部署

访问: `http://your-domain.com/test_ai_description_processor.html`

---

## 更新部署

### 本地开发环境

```bash
# 拉取最新代码
git pull origin main

# 安装新依赖（如有）
pip install -r requirements.txt

# 重启服务
# Windows: Ctrl+C 然后重新运行 python run_app.py
# Linux/Mac: 同上
```

### Render

Render会自动检测GitHub仓库的更新并重新部署。

手动触发部署:
1. 进入Render Dashboard
2. 选择服务
3. 点击 "Manual Deploy" → "Deploy latest commit"

### 阿里云ECS

```bash
# 连接到服务器
ssh root@your-server-ip

# 进入应用目录
cd /var/www/patent-app

# 拉取最新代码
sudo git pull origin main

# 运行部署脚本
sudo ./scripts/deploy_ai_description_processor.sh

# 服务会自动重启
```

或使用快速更新脚本:

```bash
# 创建快速更新脚本
cat > /usr/local/bin/update-patent-app << 'EOF'
#!/bin/bash
cd /var/www/patent-app
git pull origin main
pip3 install -r requirements.txt --quiet
systemctl restart patent-app
echo "更新完成"
EOF

chmod +x /usr/local/bin/update-patent-app

# 使用
sudo update-patent-app
```

---

## 监控和维护

### 日志查看

**本地开发**:
```bash
# 查看控制台输出
```

**Render**:
```
在Dashboard的Logs标签查看
```

**阿里云ECS**:
```bash
# 查看应用日志
sudo journalctl -u patent-app -f

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 性能监控

创建监控脚本 `scripts/monitor_ai_processor.sh`:

```bash
#!/bin/bash
# 监控AI处理器性能

echo "=== AI Description Processor 监控 ==="
echo ""

# 检查服务状态
echo "服务状态:"
systemctl is-active patent-app && echo "✓ 运行中" || echo "✗ 已停止"
echo ""

# 检查内存使用
echo "内存使用:"
ps aux | grep gunicorn | grep -v grep | awk '{sum+=$6} END {print sum/1024 " MB"}'
echo ""

# 检查API响应时间
echo "API响应时间:"
curl -o /dev/null -s -w "响应时间: %{time_total}s\n" http://localhost:5000/api/drawing-marker/extract \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"description_text":"测试","ai_mode":false}'
echo ""

# 检查最近的错误
echo "最近的错误 (最近10条):"
sudo journalctl -u patent-app --since "1 hour ago" | grep -i error | tail -10
```

### 备份

```bash
# 备份配置文件
sudo tar -czf /backup/patent-app-config-$(date +%Y%m%d).tar.gz \
  /var/www/patent-app/.env \
  /var/www/patent-app/config/models.json \
  /etc/nginx/sites-available/patent-app \
  /etc/systemd/system/patent-app.service

# 定期备份（添加到crontab）
0 2 * * * /path/to/backup-script.sh
```

---

## 故障排查

### 问题: 服务无法启动

**检查步骤**:
```bash
# 查看详细错误
sudo journalctl -u patent-app -n 50

# 检查端口占用
sudo netstat -tlnp | grep 5000

# 检查Python环境
which python3
python3 --version

# 手动启动测试
cd /var/www/patent-app
source venv/bin/activate
python3 run_app.py
```

### 问题: API调用失败

**检查步骤**:
1. 验证API密钥是否正确
2. 检查网络连接
3. 查看应用日志
4. 测试API连接:

```bash
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4-flash","messages":[{"role":"user","content":"测试"}]}'
```

### 问题: 处理速度慢

**优化方法**:
1. 增加服务器资源（CPU/内存）
2. 使用更快的模型（GLM-4-Air）
3. 增加Gunicorn worker数量
4. 启用缓存机制

### 问题: 内存占用高

**解决方法**:
```bash
# 限制worker数量
# 编辑 gunicorn_config.py
workers = 2  # 减少worker数量

# 重启服务
sudo systemctl restart patent-app
```

---

## 安全建议

1. **保护API密钥**:
   - 不要提交到Git
   - 使用环境变量
   - 定期轮换

2. **启用HTTPS**:
   - 使用Let's Encrypt免费证书
   - 强制HTTPS重定向

3. **防火墙配置**:
```bash
# 只开放必要端口
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

4. **限流保护**:
   - 在Nginx中配置限流
   - 限制单个IP的请求频率

5. **日志审计**:
   - 记录所有API调用
   - 定期检查异常访问

---

## 相关文档

- [用户指南](../features/ai_description_processor_guide.md)
- [配置指南](../features/ai_description_processor_config.md)
- [API文档](../../backend/routes/drawing_marker.py)

---

**最后更新**: 2026-02-01  
**文档版本**: 1.0.0
