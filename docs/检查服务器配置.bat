@echo off
chcp 65001 >nul
echo ========================================
echo 检查阿里云服务器配置
echo ========================================
echo.

set SERVER_IP=43.99.101.195

echo 正在连接服务器 %SERVER_IP%...
echo.

echo [1] 检查用户...
ssh root@%SERVER_IP% "echo '当前用户:' && whoami && echo '所有用户:' && cat /etc/passwd | grep -E 'appuser|www|root' | cut -d: -f1"
echo.

echo [2] 检查项目路径...
ssh root@%SERVER_IP% "echo '检查 /home/appuser/patent-app:' && ls -la /home/appuser/patent-app 2>&1 | head -5 && echo '' && echo '检查 /www/wwwroot/patent-workbench:' && ls -la /www/wwwroot/patent-workbench 2>&1 | head -5"
echo.

echo [3] 检查systemd服务...
ssh root@%SERVER_IP% "echo 'systemd服务列表:' && systemctl list-units --type=service | grep -E 'patent|gunicorn'"
echo.

echo [4] 检查运行中的Python进程...
ssh root@%SERVER_IP% "echo 'Python进程:' && ps aux | grep python | grep -v grep"
echo.

echo [5] 检查端口监听...
ssh root@%SERVER_IP% "echo '端口5000监听:' && netstat -tlnp | grep 5000"
echo.

echo [6] 检查Git仓库...
ssh root@%SERVER_IP% "if [ -d /home/appuser/patent-app/.git ]; then echo '/home/appuser/patent-app 是Git仓库' && cd /home/appuser/patent-app && git remote -v && git branch; fi && if [ -d /www/wwwroot/patent-workbench/.git ]; then echo '/www/wwwroot/patent-workbench 是Git仓库' && cd /www/wwwroot/patent-workbench && git remote -v && git branch; fi"
echo.

echo ========================================
echo 检查完成
echo ========================================
echo.
pause
