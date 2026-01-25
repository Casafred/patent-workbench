@echo off
chcp 65001 >nul
echo ========================================
echo 功能八OCR诊断工具 - 启动脚本
echo ========================================
echo.
echo 正在启动应用...
echo.

start python run_app.py

echo 等待应用启动（5秒）...
timeout /t 5 /nobreak >nul

echo.
echo 正在打开诊断工具...
start http://localhost:5000/test_drawing_marker_debug.html

echo.
echo ========================================
echo 诊断工具已在浏览器中打开！
echo ========================================
echo.
echo 如果浏览器没有自动打开，请手动访问：
echo http://localhost:5000/test_drawing_marker_debug.html
echo.
echo 按任意键关闭此窗口...
pause >nul
