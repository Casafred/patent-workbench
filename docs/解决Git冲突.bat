@echo off
chcp 65001 >nul
echo ========================================
echo 解决阿里云Git冲突 - gunicorn_config.py
echo ========================================
echo.
echo 问题：服务器上有未跟踪的 gunicorn_config.py 文件
echo 解决：备份后拉取新代码
echo.
echo ========================================
echo 开始执行...
echo ========================================
echo.

ssh root@43.99.101.195 "cd /home/appuser/patent-app && mv gunicorn_config.py gunicorn_config.py.server.backup && git pull origin main && chown -R appuser:appuser /home/appuser/patent-app && systemctl restart patent-app"

echo.
echo ========================================
echo 验证服务状态...
echo ========================================
echo.

ssh root@43.99.101.195 "systemctl status patent-app | grep Active"

echo.
echo ========================================
echo 检查端口监听...
echo ========================================
echo.

ssh root@43.99.101.195 "netstat -tlnp | grep 5000"

echo.
echo ========================================
echo 完成！
echo ========================================
echo.
echo 如果服务无法访问，执行恢复命令：
echo ssh root@43.99.101.195 "cd /home/appuser/patent-app && cp gunicorn_config.py.server.backup gunicorn_config.py && systemctl restart patent-app"
echo.
pause
