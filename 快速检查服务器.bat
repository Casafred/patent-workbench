@echo off
chcp 65001 >nul
echo ========================================
echo 快速检查阿里云服务器配置
echo ========================================
echo.

set SERVER_IP=43.99.101.195

echo 正在连接服务器 %SERVER_IP%...
echo.

echo [检查1] 项目路径 /home/appuser/patent-app
ssh root@%SERVER_IP% "ls -la /home/appuser/patent-app 2>&1 | head -5"
echo.

echo [检查2] 项目路径 /www/wwwroot/patent-workbench  
ssh root@%SERVER_IP% "ls -la /www/wwwroot/patent-workbench 2>&1 | head -5"
echo.

echo [检查3] 服务状态
ssh root@%SERVER_IP% "systemctl list-units --type=service | grep -E 'patent|gunicorn'"
echo.

echo [检查4] 端口监听
ssh root@%SERVER_IP% "netstat -tlnp | grep 5000"
echo.

echo ========================================
echo 检查完成
echo ========================================
pause
