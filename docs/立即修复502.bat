@echo off
chcp 65001 >nul
echo ========================================
echo 立即修复502错误 - 语法错误已修复
echo ========================================
echo.

echo [1/4] 拉取最新代码...
ssh root@47.115.229.99 "cd /root/patent-workbench && git pull origin main"

echo.
echo [2/4] 验证Python语法...
ssh root@47.115.229.99 "cd /root/patent-workbench && python3 -m py_compile backend/scraper/simple_scraper.py && echo '✓ 语法正确'"

echo.
echo [3/4] 重启服务...
ssh root@47.115.229.99 "systemctl restart patent-app.service"

echo.
echo [4/4] 等待5秒后检查状态...
timeout /t 5 /nobreak >nul
ssh root@47.115.229.99 "systemctl status patent-app.service | head -15"

echo.
echo ========================================
echo 修复完成！
echo 请访问网站验证：http://ipx.asia
echo ========================================
echo.
echo 如果仍然502，请运行：
echo ssh root@47.115.229.99 "journalctl -u patent-app.service -n 50"
echo.
pause
