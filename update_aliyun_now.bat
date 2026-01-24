@echo off
echo ==========================================
echo   阿里云服务器更新
echo ==========================================
echo.
echo 正在连接服务器并更新代码...
echo.

REM 使用正确的路径和命令
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git pull origin main' && systemctl restart patent-app && echo '更新完成！' && systemctl status patent-app --no-pager | head -10"

echo.
echo ==========================================
echo 更新完成！请访问 http://43.99.101.195 测试
echo ==========================================
echo.
pause
