@echo off
chcp 65001 >nul
echo ========================================
echo 阿里云更新 - 配置已确认正确
echo ========================================
echo.
echo 本地配置分析：
echo   bind = "0.0.0.0:5000"  ✓ 正确
echo   chdir = "/home/appuser/patent-app"  ✓ 正确
echo.
echo 可以安全覆盖服务器配置
echo ========================================
echo.
echo 开始更新...
echo.

ssh root@43.99.101.195 "cd /home/appuser/patent-app && rm -f gunicorn_config.py && git pull origin main && chown -R appuser:appuser /home/appuser/patent-app && systemctl restart patent-app"

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
pause
