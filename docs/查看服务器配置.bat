@echo off
chcp 65001 >nul
echo ========================================
echo 查看服务器上的 gunicorn_config.py
echo ========================================
echo.

ssh root@43.99.101.195 "cat /home/appuser/patent-app/gunicorn_config.py"

echo.
echo ========================================
pause
