@echo off
chcp 65001 >nul
echo ========================================
echo 紧急修复502错误 - 2026年2月4日
echo ========================================
echo.

echo [步骤1] 查看服务状态...
ssh root@47.115.229.99 "systemctl status patent-app.service"

echo.
echo [步骤2] 查看错误日志（最后50行）...
ssh root@47.115.229.99 "journalctl -u patent-app.service -n 50 --no-pager"

echo.
echo [步骤3] 检查Python语法错误...
ssh root@47.115.229.99 "cd /root/patent-workbench && python3 -m py_compile backend/scraper/simple_scraper.py"

echo.
echo [步骤4] 测试导入...
ssh root@47.115.229.99 "cd /root/patent-workbench && python3 -c 'from backend.scraper.simple_scraper import SimplePatentScraper; print(\"导入成功\")'"

echo.
echo ========================================
echo 诊断完成，按任意键继续修复...
pause >nul

echo.
echo [修复步骤1] 重启服务...
ssh root@47.115.229.99 "systemctl restart patent-app.service"

echo.
echo [修复步骤2] 等待5秒...
timeout /t 5 /nobreak >nul

echo.
echo [修复步骤3] 检查服务状态...
ssh root@47.115.229.99 "systemctl status patent-app.service"

echo.
echo [修复步骤4] 检查端口...
ssh root@47.115.229.99 "netstat -tlnp | grep 5000"

echo.
echo ========================================
echo 修复完成！
echo 请访问网站验证：http://ipx.asia
echo ========================================
pause
