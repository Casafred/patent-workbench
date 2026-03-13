# 阿里云服务器登录问题排查操作指南

## 第一步：SSH 登录服务器

```bash
# 使用 SSH 登录（替换为你的服务器 IP）
ssh root@你的服务器IP

# 或者使用密钥登录
ssh -i /path/to/your/key.pem root@你的服务器IP
```

## 第二步：查找服务名称

```bash
# 查看所有运行的服务
systemctl list-units --type=service | grep -i patent

# 或者查找 gunicorn 相关服务
systemctl list-units --type=service | grep -i gunicorn

# 或者查找 app 相关服务
systemctl list-units --type=service | grep -i app
```

**记下服务名称**，例如：`patent-workbench.service` 或 `gunicorn.service`

## 第三步：实时查看日志（最关键！）

### 方法 1: 使用 journalctl（推荐）

```bash
# 实时查看服务日志（替换为你的服务名）
sudo journalctl -u patent-workbench -f

# 或者查看最近 100 条日志
sudo journalctl -u patent-workbench -n 100 --no-pager

# 查看最近的错误日志
sudo journalctl -u patent-workbench -p err -n 50
```

### 方法 2: 查看 Gunicorn 日志

```bash
# 查找日志文件位置
find /home/appuser/patent-app -name "*.log" -type f

# 查看日志文件（假设找到了 app.log）
tail -f /home/appuser/patent-app/app.log

# 或者查看错误日志
tail -f /home/appuser/patent-app/logs/error.log
```

### 方法 3: 查看 Nginx 日志

```bash
# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 查看 Nginx 访问日志
sudo tail -f /var/log/nginx/access.log
```

## 第四步：触发错误并查看日志

### 操作流程：

1. **窗口 1**：运行日志监控命令
   ```bash
   sudo journalctl -u patent-workbench -f
   ```

2. **窗口 2**（新开一个 SSH 窗口）：使用 curl 测试登录
   ```bash
   # 测试登录接口（替换用户名和密码）
   curl -X POST http://127.0.0.1:5000/login \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=testuser&password=testpass" \
        -i
   ```

3. **观察窗口 1**：查看日志中是否出现 `Traceback` 错误信息

## 第五步：查看完整的错误堆栈

当你在日志中看到错误时，复制完整的堆栈信息，例如：

```
Traceback (most recent call last):
  File "/home/appuser/patent-app/backend/routes/auth.py", line 123, in login
    result = some_function()
  File "/home/appuser/patent-app/backend/services/auth_service.py", line 456, in some_function
    raise ValueError("具体错误信息")
ValueError: 具体错误信息
```

## 第六步：检查常见问题

### 检查 1: 环境变量

```bash
# 查看所有环境变量
env

# 查看特定的环境变量
env | grep DATABASE_URL
env | grep SECRET_KEY
env | grep FLASK
```

### 检查 2: 配置文件

```bash
# 查看 .env 文件（如果存在）
cat /home/appuser/patent-app/.env

# 查看 config.py
cat /home/appuser/patent-app/backend/config.py
```

### 检查 3: 文件权限

```bash
# 查看项目目录权限
ls -la /home/appuser/patent-app/

# 查看用户管理文件权限
ls -la /home/appuser/patent-app/backend/user_management/

# 查看日志目录权限
ls -la /home/appuser/patent-app/logs/
```

### 检查 4: Python 依赖

```bash
# 查看已安装的包
pip list | grep Flask
pip list | grep gunicorn

# 或者使用 pip3
pip3 list | grep Flask
```

## 第七步：临时启用调试模式（可选）

如果日志中没有详细错误，可以临时启用调试模式：

```bash
# 编辑配置文件
vi /home/appuser/patent-app/backend/config.py

# 找到 DEBUG = False，改为 DEBUG = True
# 保存退出 (:wq)

# 重启服务
sudo systemctl restart patent-workbench

# 再次尝试登录，浏览器会显示详细错误
```

**⚠️ 重要**: 查看到错误后，立即改回 `DEBUG = False` 并重启服务！

## 第八步：查看进程状态

```bash
# 查看 Gunicorn 进程
ps aux | grep gunicorn

# 查看进程详细信息
ps -ef | grep gunicorn

# 查看端口占用
netstat -tulpn | grep 5000
# 或者
ss -tulpn | grep 5000
```

## 第九步：查看系统资源

```bash
# 查看内存使用
free -h

# 查看 CPU 使用
top

# 查看磁盘使用
df -h

# 查看 inode 使用
df -i
```

## 第十步：收集诊断信息

如果问题仍未解决，请收集以下信息：

```bash
# 1. 服务状态
sudo systemctl status patent-workbench > service_status.txt

# 2. 最近日志
sudo journalctl -u patent-workbench -n 200 > service_logs.txt

# 3. Nginx 日志
sudo tail -n 100 /var/log/nginx/error.log > nginx_error.txt

# 4. 环境变量
env > env_vars.txt

# 5. 配置文件
cat /home/appuser/patent-app/backend/config.py > config_backup.txt

# 6. 进程信息
ps aux | grep gunicorn > process_info.txt

# 7. 端口信息
netstat -tulpn > port_info.txt
```

将所有 `.txt` 文件打包发送给我分析。

---

## 快速诊断命令（一键执行）

创建一个诊断脚本：

```bash
cat > /tmp/diagnose.sh << 'EOF'
#!/bin/bash
echo "=== 服务状态 ==="
sudo systemctl status patent-workbench

echo -e "\n=== 最近日志 ==="
sudo journalctl -u patent-workbench -n 50 --no-pager

echo -e "\n=== Nginx 错误日志 ==="
sudo tail -n 20 /var/log/nginx/error.log

echo -e "\n=== 环境变量 ==="
env | grep -E "DATABASE_URL|SECRET_KEY|FLASK|PORT"

echo -e "\n=== 进程信息 ==="
ps aux | grep gunicorn

echo -e "\n=== 端口信息 ==="
netstat -tulpn | grep 5000

echo -e "\n=== 磁盘空间 ==="
df -h | grep -E "Filesystem|/$"
EOF

chmod +x /tmp/diagnose.sh
/tmp/diagnose.sh
```

---

## 现在请执行：

1. **SSH 登录服务器**
2. **运行**：`sudo journalctl -u patent-workbench -f`
3. **在浏览器中尝试登录**
4. **复制日志中出现的错误信息**（以 `Traceback` 开头的完整堆栈）
5. **发给我分析**

有了错误堆栈，我就能 100% 定位问题！🔍
