@echo off
REM 阿里云服务器代码更新脚本（Windows版）
REM 使用方法：双击运行或在命令行执行 scripts\update_aliyun.bat

echo ==========================================
echo   阿里云服务器代码更新
echo ==========================================
echo.

set SERVER_IP=43.99.101.195

echo 正在连接到服务器 %SERVER_IP% ...
echo.
echo 请输入服务器密码...
echo.

REM 执行SSH命令
ssh root@%SERVER_IP% "su - appuser -c 'cd ~/patent-app && git pull origin main' && systemctl restart patent-app && echo '更新完成！' && systemctl status patent-app --no-pager | head -10"

echo.
echo ==========================================
echo 更新完成！
echo ==========================================
echo.
echo 访问地址: http://%SERVER_IP%
echo.
pause
