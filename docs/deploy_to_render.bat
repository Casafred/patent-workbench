@echo off
chcp 65001 >nul
echo ========================================
echo 部署到 Render - 完整流程
echo ========================================
echo.

echo 步骤 1: 检查文件
echo ========================================
if not exist "backend\user_management\users.json" (
    echo ❌ 错误：找不到 users.json 文件
    pause
    exit /b 1
)
echo ✅ users.json 文件存在
echo.

echo 步骤 2: 验证 JSON 格式
echo ========================================
python -c "import json; json.load(open('backend/user_management/users.json', 'r', encoding='utf-8')); print('✅ JSON 格式正确')" 2>nul
if %errorlevel% neq 0 (
    echo ❌ JSON 格式错误
    pause
    exit /b 1
)
echo.

echo 步骤 3: 测试密码
echo ========================================
python test_passwords.py
echo.

echo 步骤 4: 推送代码到 GitHub
echo ========================================
echo 当前修改：
git status --short
echo.
echo 是否要推送到 GitHub？
set /p push="输入 y 继续，其他键跳过: "
if /i "%push%"=="y" (
    git add backend/config.py
    git commit -m "修复：适配 Render Secret Files 路径"
    git push origin main
    echo ✅ 代码已推送
) else (
    echo ⏭️  跳过推送
)
echo.

echo 步骤 5: 复制 users.json 内容
echo ========================================
type backend\user_management\users.json | clip
echo ✅ 文件内容已复制到剪贴板
echo.

echo ========================================
echo 📋 Render 配置步骤
echo ========================================
echo.
echo 1️⃣  登录 Render Dashboard
echo    https://dashboard.render.com/
echo.
echo 2️⃣  选择你的服务
echo.
echo 3️⃣  等待自动部署完成（如果推送了代码）
echo    在 Logs 标签查看部署进度
echo.
echo 4️⃣  进入 Environment → Secret Files
echo.
echo 5️⃣  删除所有旧的 users.json 条目（如果有）
echo    点击 Save Changes 并等待部署完成
echo.
echo 6️⃣  添加新的 Secret File
echo    点击 Add Secret File
echo.
echo 7️⃣  填写信息：
echo    Filename: users.json
echo    ⚠️  重要：只写 users.json，不要加路径！
echo.
echo 8️⃣  粘贴内容：
echo    在 Contents 字段按 Ctrl+V 粘贴
echo.
echo 9️⃣  保存并等待部署
echo    点击 Save Changes
echo    等待 2-5 分钟
echo.
echo 🔟 测试登录
echo    访问: https://your-app.onrender.com/login
echo.
echo ========================================
echo 🔑 测试账号
echo ========================================
echo    用户名: admin      密码: admin123
echo    用户名: demo       密码: demo123
echo    用户名: test       密码: test123
echo ========================================
echo.
pause
