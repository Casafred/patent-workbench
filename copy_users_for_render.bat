@echo off
chcp 65001 >nul
echo ========================================
echo 复制 users.json 到剪贴板
echo ========================================
echo.

if not exist "backend\user_management\users.json" (
    echo ❌ 错误：找不到 users.json 文件
    echo 请确保在项目根目录运行此脚本
    pause
    exit /b 1
)

echo ✅ 找到文件：backend\user_management\users.json
echo.
echo 📋 正在复制文件内容到剪贴板...
type backend\user_management\users.json | clip

if %errorlevel% equ 0 (
    echo ✅ 成功！文件内容已复制到剪贴板
    echo.
    echo 📝 下一步：
    echo    1. 登录 Render Dashboard
    echo    2. 进入你的服务 → Environment → Secret Files
    echo    3. 删除所有旧的 users.json 条目
    echo    4. 点击 Add Secret File
    echo    5. Filename: users.json  ⚠️ 只写文件名，不要路径！
    echo    6. Contents: 按 Ctrl+V 粘贴
    echo    7. 点击 Save Changes
    echo.
    echo 🔑 测试账号：
    echo    用户名: admin     密码: admin123
    echo    用户名: demo      密码: demo123
    echo    用户名: test      密码: test123
) else (
    echo ❌ 复制失败
)

echo.
echo ========================================
pause
