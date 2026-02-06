@echo off
chcp 65001 >nul
echo ========================================
echo 测试认证绕过功能
echo ========================================
echo.
echo 请确保应用已经在另一个窗口运行！
echo 如果还没有运行，请先运行: python run_app.py
echo.
pause
echo.
echo 开始测试...
echo.
python test_auth_bypass.py
echo.
echo ========================================
echo 测试完成
echo ========================================
pause
