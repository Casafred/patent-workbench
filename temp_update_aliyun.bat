@echo off
echo 正在更新阿里云服务器代码...
echo.
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git pull origin main' && systemctl restart patent-app"
echo.
echo 更新完成！
pause
