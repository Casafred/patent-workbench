@echo off
chcp 65001 >nul
echo ========================================
echo 用户协议功能测试
echo ========================================
echo.

echo [1/3] 检查文件是否存在...
if exist "frontend\user-agreement.html" (
    echo ✓ 用户协议文件存在
) else (
    echo ✗ 用户协议文件不存在
    goto :error
)

if exist "frontend\privacy.html" (
    echo ✓ 隐私政策文件存在
) else (
    echo ✗ 隐私政策文件不存在
    goto :error
)

if exist "frontend\disclaimer.html" (
    echo ✓ 免责声明文件存在
) else (
    echo ✗ 免责声明文件不存在
    goto :error
)

echo.
echo [2/3] 检查登录页面修改...
findstr /C:"agreement-section" backend\routes\auth.py >nul
if %errorlevel% equ 0 (
    echo ✓ 登录页面已添加协议勾选区域
) else (
    echo ✗ 登录页面未找到协议勾选区域
    goto :error
)

findstr /C:"agreement-check" backend\routes\auth.py >nul
if %errorlevel% equ 0 (
    echo ✓ 登录页面已添加协议复选框
) else (
    echo ✗ 登录页面未找到协议复选框
    goto :error
)

echo.
echo [3/3] 启动测试服务器...
echo.
echo 请在浏览器中访问: http://localhost:5000/login
echo.
echo 测试项目:
echo   1. 登录页面是否显示协议勾选框
echo   2. 未勾选协议时是否无法登录
echo   3. 勾选协议后是否可以正常登录
echo   4. 点击协议链接是否能打开协议文档
echo.
echo 按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

python run_app.py

goto :end

:error
echo.
echo ========================================
echo 测试失败! 请检查文件是否正确创建。
echo ========================================
pause
exit /b 1

:end
