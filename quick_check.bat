@echo off
echo 正在检查服务器状态...
echo.
curl -s http://43.99.101.195/api/patent/version
echo.
echo.
pause
