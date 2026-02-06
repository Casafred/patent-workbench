@echo off
chcp 65001 >nul
echo ======================================
echo 从GitHub拉取代码并部署
echo ======================================
echo.
echo 这个脚本会：
echo 1. 从GitHub拉取最新代码
echo 2. 清除Python缓存
echo 3. 重启服务
echo.
pause

echo.
echo [步骤1] 连接到服务器并拉取代码...
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git pull origin main"

echo.
echo [步骤2] 修复文件权限...
ssh root@43.99.101.195 "chown -R appuser:appuser /home/appuser/patent-app"

echo.
echo [步骤3] 清除Python缓存...
ssh root@43.99.101.195 "find /home/appuser/patent-app -type f -name '*.pyc' -delete && find /home/appuser/patent-app -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null ; echo 'Cache cleared'"

echo.
echo [步骤4] 完全停止服务...
ssh root@43.99.101.195 "systemctl stop patent-app && pkill -9 -f 'gunicorn.*patent' ; echo 'Service stopped'"

echo.
echo [步骤5] 启动服务...
ssh root@43.99.101.195 "systemctl start patent-app"

echo.
echo [步骤6] 等待服务启动...
timeout /t 3 /nobreak >nul

echo.
echo [步骤7] 查看服务状态...
ssh root@43.99.101.195 "systemctl status patent-app --no-pager"

echo.
echo ======================================
echo ✅ 部署完成！
echo ======================================
echo.
echo 访问测试: http://43.99.101.195
echo.
echo 查看实时日志:
echo ssh root@43.99.101.195 "journalctl -u patent-app -f"
echo.
pause
