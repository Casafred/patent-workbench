@echo off
chcp 65001 >nul
echo ========================================
echo 功能八 v8.0 路径修复 - 快速部署
echo ========================================
echo.
echo 正在连接服务器并部署修复...
echo.

ssh root@47.115.229.99 "cd /root/patent-workbench && git pull origin main && systemctl restart patent-workbench && echo '部署完成！' && systemctl status patent-workbench --no-pager -l"

echo.
echo ========================================
echo 部署完成！请访问 https://ipx.asia/app 验证
echo ========================================
echo.
pause
