@echo off
chcp 65001 >nul
echo ========================================
echo 登录页面优化功能测试
echo ========================================
echo.

echo [检查] 验证二维码图片是否存在...
if exist "frontend\images\QRcode.jpg" (
    echo ✓ 二维码图片存在
) else (
    echo ✗ 二维码图片不存在
    echo 请确保 frontend\images\QRcode.jpg 文件存在
    pause
    exit /b 1
)

echo.
echo [检查] 验证代码修改...
findstr /C:"get-account-btn" backend\routes\auth.py >nul
if %errorlevel% equ 0 (
    echo ✓ 获取账号按钮已添加
) else (
    echo ✗ 获取账号按钮未找到
    pause
    exit /b 1
)

findstr /C:"qr-modal" backend\routes\auth.py >nul
if %errorlevel% equ 0 (
    echo ✓ 二维码弹窗已添加
) else (
    echo ✗ 二维码弹窗未找到
    pause
    exit /b 1
)

findstr /C:"error=None" backend\routes\auth.py >nul
if %errorlevel% equ 0 (
    echo ✓ 错误提示逻辑已修复
) else (
    echo ✗ 错误提示逻辑未修复
    pause
    exit /b 1
)

echo.
echo ========================================
echo 所有检查通过! 启动测试服务器...
echo ========================================
echo.
echo 请在浏览器中访问: http://localhost:5000/login
echo.
echo 测试项目:
echo.
echo [1] 错误提示测试
echo   ✓ 首次访问页面无错误提示
echo   ✓ 输入错误密码后显示错误提示
echo   ✓ 未勾选协议时弹出提示
echo.
echo [2] 获取账号功能测试
echo   ✓ 点击"获取账号"按钮打开弹窗
echo   ✓ 弹窗显示二维码和说明文字
echo   ✓ 点击×关闭弹窗
echo   ✓ 点击弹窗外部关闭弹窗
echo.
echo 按 Ctrl+C 停止服务器
echo.
echo ========================================
echo.

python run_app.py
