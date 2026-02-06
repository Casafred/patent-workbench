@echo off
chcp 65001 >nul
echo ========================================
echo 快速部署交互式标注功能
echo ========================================
echo.
echo 正在上传文件...
echo.

scp js/drawingMarkerInteractive.js root@43.99.101.195:/home/appuser/patent-app/js/
scp frontend/index.html root@43.99.101.195:/home/appuser/patent-app/frontend/

echo.
echo ========================================
echo ✅ 上传完成！
echo ========================================
echo.
echo 请在浏览器中按 Ctrl+F5 强制刷新页面
echo.
pause
