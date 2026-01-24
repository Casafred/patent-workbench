# 阿里云部署故障排查手册

> 遇到问题？按照这个手册逐步排查，99%的问题都能解决

## 🔍 快速诊断

### 一键检查脚本

```bash
#!/bin/bash
echo "========== 系统诊断 =========="

echo "1. 检查服务状态..."
systemctl status patent-app --no-pager | head -5
systemctl status nginx --no-pager | head -5
systemctl status postgresql --no-pager | head -5

echo ""
echo "2. 检查端口监听..."
netstat -tlnp | grep -E ':(80|5001|5432)'

echo ""
echo "3. 检查磁盘空间..."
df -h | grep -E '(Filesystem|/$)'

echo ""
echo "4. 检查内存使用..."
free -h

echo ""
echo "5. 检查最近错误日志..."
tail -20 /home/appuser/patent-app/logs/error.log

echo ""
echo "========== 诊断完成 =========="
```

**使用方法：**
```bash
# 保存为 diagnose.sh
nano diagnose.sh
# 粘贴上面的内容，保存

# 运行
bash diagnose.sh
```

---

## 🚨 常见问题及解决方案

### 问题1：无法访问网站（最常见）

**症状：**
- 浏览器显示"无法访问此网站"
- 或"连接超时"

**原因：**
- 阿里云安全组未开放80端口（90%的情况）
- Nginx未启动
- 应用未启动

**解决步骤：**

**步骤1：检查阿里云安全组**
```
1. 登录阿里云控制台
2. 进入ECS实例
3. 点击"安全组"
4. 点击"配置规则"
5. 查看入方向规则，是否有：
   - 端口：80/80
   - 协议：TCP
   - 授权对象：0.0.0.0/0
6. 如果没有，点击"添加规则"添加
```

**步骤2：检查Nginx状态**
```bash
systemctl status nginx

# 如果未运行
systemctl start nginx

# 如果启动失败
nginx -t  # 检查配置
tail -f /var/log/nginx/error.log  # 查看错误
```

**步骤3：检查应用状态**
```bash
systemctl status patent-app

# 如果未运行
systemctl start patent-app

# 如果启动失败
journalctl -u patent-app -n 50  # 查看错误
```

**步骤4：测试本地访问**
```bash
# 在服务器上测试
curl http://localhost

# 应该返回HTML内容
# 如果返回502，说明应用未启动
# 如果返回404，说明Nginx配置有问题
```

---

### 问题2：502 Bad Gateway

**症状：**
- 浏览器显示"502 Bad Gateway"

**原因：**
- 应用未启动
- 应用启动失败
- Gunicorn配置错误

**解决步骤：**

**步骤1：检查应用状态**
```bash
systemctl status patent-app

# 查看详细日志
journalctl -u patent-app -n 50
```

**步骤2：手动启动测试**
```bash
# 切换到appuser
su - appuser
cd ~/patent-app
source venv/bin/activate

# 手动启动
gunicorn --config gunicorn_config.py wsgi:app

# 观察输出，看是否有错误
# 按Ctrl+C停止
```

**步骤3：检查常见错误**

**错误A：ModuleNotFoundError**
```bash
# 重新安装依赖
pip install -r requirements.txt
```

**错误B：数据库连接失败**
```bash
# 检查.env文件
cat .env | grep DATABASE_URL

# 测试数据库连接
psql -U patent_user -d patent_db -h localhost
# 输入密码
```

**错误C：端口被占用**
```bash
# 查看5001端口
netstat -tlnp | grep 5001

# 如果被占用，杀死进程
kill -9 进程ID
```

**步骤4：重启服务**
```bash
exit  # 退出appuser
systemctl restart patent-app
systemctl status patent-app
```

---

### 问题3：500 Internal Server Error

**症状：**
- 浏览器显示"500 Internal Server Error"

**原因：**
- 应用代码错误
- 环境变量配置错误
- 数据库连接失败

**解决步骤：**

**步骤1：查看应用日志**
```bash
tail -f /home/appuser/patent-app/logs/error.log
```

**步骤2：检查环境变量**
```bash
su - appuser
cd ~/patent-app
cat .env

# 检查必需的变量：
# - FLASK_SECRET_KEY（至少32位）
# - DATABASE_URL（格式正确）
# - PORT=5001
```

**步骤3：检查数据库**
```bash
# 测试连接
sudo -u postgres psql -U patent_user -d patent_db -h localhost

# 如果连接失败，检查密码
# 重置密码：
sudo -u postgres psql
ALTER USER patent_user WITH PASSWORD '新密码';
\q

# 更新.env中的DATABASE_URL
```

**步骤4：检查文件权限**
```bash
# 确保appuser有权限
chown -R appuser:appuser /home/appuser/patent-app
chmod -R 755 /home/appuser/patent-app
```

---

### 问题4：数据库连接失败

**症状：**
- 日志显示"could not connect to server"
- 或"password authentication failed"

**原因：**
- PostgreSQL未启动
- 数据库密码错误
- 数据库不存在

**解决步骤：**

**步骤1：检查PostgreSQL状态**
```bash
systemctl status postgresql

# 如果未运行
systemctl start postgresql
```

**步骤2：验证数据库存在**
```bash
sudo -u postgres psql -l | grep patent_db

# 如果不存在，创建
sudo -u postgres psql
CREATE DATABASE patent_db;
CREATE USER patent_user WITH PASSWORD '你的密码';
GRANT ALL PRIVILEGES ON DATABASE patent_db TO patent_user;
\q
```

**步骤3：测试连接**
```bash
# 使用.env中的密码测试
psql -U patent_user -d patent_db -h localhost
# 输入密码

# 如果成功，输入 \q 退出
# 如果失败，重置密码（见上面步骤3）
```

**步骤4：更新.env文件**
```bash
su - appuser
cd ~/patent-app
nano .env

# 确保DATABASE_URL格式正确：
# DATABASE_URL=postgresql://patent_user:密码@localhost/patent_db

# 保存后重启
exit
systemctl restart patent-app
```

---

### 问题5：上传文件失败

**症状：**
- 上传Excel文件时报错
- 或上传后无响应

**原因：**
- 文件大小超限
- uploads目录权限问题
- 磁盘空间不足

**解决步骤：**

**步骤1：检查磁盘空间**
```bash
df -h

# 如果使用率>90%，清理空间
# 删除旧的上传文件
find /home/appuser/patent-app/uploads -type f -mtime +7 -delete

# 清理日志
find /home/appuser/patent-app/logs -type f -mtime +7 -delete
```

**步骤2：检查uploads目录**
```bash
# 确保目录存在
mkdir -p /home/appuser/patent-app/uploads

# 设置权限
chown -R appuser:appuser /home/appuser/patent-app/uploads
chmod -R 755 /home/appuser/patent-app/uploads
```

**步骤3：检查Nginx上传限制**
```bash
# 编辑Nginx配置
nano /etc/nginx/sites-available/patent-app

# 确保有这一行：
# client_max_body_size 16M;

# 如果没有，添加到server块中
# 保存后重启
nginx -t
systemctl restart nginx
```

**步骤4：检查应用日志**
```bash
tail -f /home/appuser/patent-app/logs/error.log
# 上传文件，观察错误信息
```

---

### 问题6：专利查询失败

**症状：**
- 查询专利时报错
- 或一直加载

**原因：**
- 网络连接问题
- Google Patents访问超时
- API密钥错误

**解决步骤：**

**步骤1：测试网络连接**
```bash
# 测试能否访问Google Patents
curl -I https://patents.google.com

# 应该返回200 OK
# 如果超时，可能是网络问题
```

**步骤2：检查应用日志**
```bash
tail -f /home/appuser/patent-app/logs/error.log
# 执行查询，观察错误
```

**步骤3：增加超时时间**
```bash
# 编辑scraper配置
su - appuser
cd ~/patent-app
nano backend/scraper/simple_scraper.py

# 找到 timeout=15，改为 timeout=30
# 保存后重启
exit
systemctl restart patent-app
```

**步骤4：检查API密钥**
```bash
# 如果使用智谱AI
su - appuser
cd ~/patent-app
cat .env | grep ZHIPUAI_API_KEY

# 确保密钥正确
```

---

### 问题7：内存不足

**症状：**
- 应用经常崩溃
- 系统响应慢
- 日志显示"MemoryError"

**原因：**
- 1核2G内存不足（用户过多）
- 内存泄漏
- Gunicorn workers过多

**解决步骤：**

**步骤1：检查内存使用**
```bash
free -h
htop  # 按q退出
```

**步骤2：减少Gunicorn workers**
```bash
su - appuser
cd ~/patent-app
nano gunicorn_config.py

# 修改：
# workers = 1  # 从2改为1
# threads = 2

# 保存后重启
exit
systemctl restart patent-app
```

**步骤3：启用swap**
```bash
# 创建2GB swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久启用
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 验证
free -h
```

**步骤4：优化应用**
```bash
# 清理临时文件
find /home/appuser/patent-app/uploads -type f -mtime +1 -delete
find /home/appuser/patent-app/tasks -type f -mtime +1 -delete

# 重启应用
systemctl restart patent-app
```

---

### 问题8：HTTPS配置失败

**症状：**
- Certbot报错
- 证书获取失败

**原因：**
- 域名未解析
- 80端口未开放
- 域名验证失败

**解决步骤：**

**步骤1：确认域名解析**
```bash
# 检查域名是否指向服务器
nslookup 你的域名

# 应该返回你的服务器IP
```

**步骤2：确认80端口可访问**
```bash
# 在浏览器访问
http://你的域名

# 应该能看到网站
```

**步骤3：获取证书**
```bash
# 停止Nginx
systemctl stop nginx

# 使用standalone模式
certbot certonly --standalone -d 你的域名

# 启动Nginx
systemctl start nginx

# 配置Nginx使用证书
certbot --nginx -d 你的域名
```

**步骤4：自动续期**
```bash
# 测试续期
certbot renew --dry-run

# 启用自动续期
systemctl enable certbot.timer
```

---

## 🔧 高级诊断

### 完整日志收集

```bash
#!/bin/bash
# 收集所有日志用于诊断

LOG_DIR="/tmp/patent-app-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p $LOG_DIR

echo "收集日志到: $LOG_DIR"

# 系统信息
uname -a > $LOG_DIR/system-info.txt
free -h >> $LOG_DIR/system-info.txt
df -h >> $LOG_DIR/system-info.txt

# 服务状态
systemctl status patent-app > $LOG_DIR/patent-app-status.txt
systemctl status nginx > $LOG_DIR/nginx-status.txt
systemctl status postgresql > $LOG_DIR/postgresql-status.txt

# 应用日志
cp /home/appuser/patent-app/logs/*.log $LOG_DIR/

# Nginx日志
cp /var/log/nginx/patent-app-*.log $LOG_DIR/

# 系统日志
journalctl -u patent-app -n 100 > $LOG_DIR/systemd-patent-app.log
journalctl -u nginx -n 100 > $LOG_DIR/systemd-nginx.log

# 配置文件
cp /home/appuser/patent-app/.env $LOG_DIR/env.txt
cp /etc/nginx/sites-available/patent-app $LOG_DIR/nginx-config.txt
cp /etc/systemd/system/patent-app.service $LOG_DIR/systemd-service.txt

# 打包
tar -czf patent-app-logs.tar.gz -C /tmp $(basename $LOG_DIR)

echo "日志已打包: patent-app-logs.tar.gz"
echo "可以下载此文件进行分析"
```

### 性能分析

```bash
# CPU使用率
top -bn1 | head -20

# 内存详情
ps aux --sort=-%mem | head -10

# 磁盘IO
iostat -x 1 5

# 网络连接
netstat -an | grep :80 | wc -l

# 应用进程
ps aux | grep gunicorn
```

---

## 📞 获取帮助

### 自助排查顺序

1. **查看本文档** - 90%的问题都在这里
2. **运行诊断脚本** - 快速定位问题
3. **查看日志** - 了解具体错误
4. **搜索错误信息** - Google/百度搜索
5. **查看官方文档** - Flask/Nginx/PostgreSQL文档

### 日志位置

```
应用日志：/home/appuser/patent-app/logs/error.log
访问日志：/home/appuser/patent-app/logs/access.log
Nginx错误：/var/log/nginx/error.log
Nginx访问：/var/log/nginx/access.log
系统日志：journalctl -u patent-app
```

### 重启服务

```bash
# 重启应用（最常用）
systemctl restart patent-app

# 重启Nginx
systemctl restart nginx

# 重启PostgreSQL
systemctl restart postgresql

# 重启所有
systemctl restart patent-app nginx postgresql
```

### 回滚操作

```bash
# 如果更新后出问题，回滚代码
su - appuser
cd ~/patent-app
git log  # 查看提交历史
git reset --hard 上一个提交ID
exit
systemctl restart patent-app
```

---

## 🎯 预防措施

### 定期维护

```bash
# 每周执行一次

# 1. 清理旧文件
find /home/appuser/patent-app/uploads -type f -mtime +7 -delete
find /home/appuser/patent-app/tasks -type f -mtime +7 -delete

# 2. 备份数据库
sudo -u postgres pg_dump patent_db > /home/appuser/backups/backup_$(date +%Y%m%d).sql

# 3. 检查磁盘空间
df -h

# 4. 检查服务状态
systemctl status patent-app nginx postgresql

# 5. 查看错误日志
tail -50 /home/appuser/patent-app/logs/error.log
```

### 监控告警

```bash
# 创建监控脚本
cat > /root/monitor.sh << 'EOF'
#!/bin/bash

# 检查服务状态
if ! systemctl is-active --quiet patent-app; then
    echo "警告：应用服务已停止" | mail -s "服务告警" your@email.com
    systemctl start patent-app
fi

# 检查磁盘空间
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "警告：磁盘使用率 ${DISK_USAGE}%" | mail -s "磁盘告警" your@email.com
fi

# 检查内存
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $MEM_USAGE -gt 90 ]; then
    echo "警告：内存使用率 ${MEM_USAGE}%" | mail -s "内存告警" your@email.com
fi
EOF

chmod +x /root/monitor.sh

# 添加到crontab（每5分钟检查一次）
crontab -e
# 添加：
# */5 * * * * /root/monitor.sh
```

---

**记住：99%的问题都能通过查看日志解决！**

```bash
tail -f /home/appuser/patent-app/logs/error.log
```
