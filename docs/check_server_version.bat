@echo off
echo ==========================================
echo   检查阿里云服务器代码版本
echo ==========================================
echo.

ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git log --oneline -3 && echo && echo 当前分支: && git branch && echo && echo 最后更新时间: && git log -1 --format=%%cd'"

echo.
echo ==========================================
echo 检查完成
echo ==========================================
pause
