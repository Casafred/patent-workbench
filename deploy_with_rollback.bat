@echo off
REM 安全部署脚本 - 带回退点 (Windows版本)
REM 使用方法: deploy_with_rollback.bat

setlocal enabledelayedexpansion

set SERVER=43.99.101.195
set USER=root
set APP_PATH=/home/appuser/patent-app

echo ==========================================
echo   开始安全部署 - 2026-02-07
echo ==========================================
echo.

REM 第一步：创建回退点
echo 📍 第一步：创建回退点...
ssh %USER%@%SERVER% "cd %APP_PATH% && echo '当前版本:' && git log -1 --oneline && echo '' && echo '创建回退点分支...' && git branch rollback-point-20260207 2>/dev/null || echo '回退点已存在' && echo '记录当前commit...' && git log -1 --format='%%H' > /tmp/last-stable-commit.txt && echo '回退点已创建:' && cat /tmp/last-stable-commit.txt"

if errorlevel 1 (
    echo ❌ 创建回退点失败！
    pause
    exit /b 1
)

echo ✅ 回退点创建成功
echo.

REM 第二步：拉取代码并重启
echo 📍 第二步：拉取最新代码并重启服务...
ssh %USER%@%SERVER% "cd %APP_PATH% && git pull origin main && chown -R appuser:appuser %APP_PATH% && systemctl restart patent-app"

if errorlevel 1 (
    echo ❌ 部署失败！
    echo 正在回退...
    ssh %USER%@%SERVER% "cd %APP_PATH% && git reset --hard rollback-point-20260207 && systemctl restart patent-app"
    pause
    exit /b 1
)

echo ✅ 代码拉取和服务重启成功
echo.

REM 第三步：验证服务状态
echo 📍 第三步：验证服务状态...
ssh %USER%@%SERVER% "systemctl status patent-app --no-pager | head -15"

if errorlevel 1 (
    echo ❌ 服务状态异常！
    echo 正在回退...
    ssh %USER%@%SERVER% "cd %APP_PATH% && git reset --hard rollback-point-20260207 && systemctl restart patent-app"
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   ✅ 部署成功！
echo ==========================================
echo.
echo 📋 部署信息:
echo   服务器: %SERVER%
echo   新版本: 60a8a3b
echo   回退点: rollback-point-20260207
echo.
echo 🔍 验证步骤:
echo   1. 访问: http://%SERVER%
echo   2. 测试登录功能
echo   3. 测试核心功能
echo.
echo 🔄 如需回退，执行:
echo   ssh %USER%@%SERVER% "cd %APP_PATH% && git reset --hard rollback-point-20260207 && systemctl restart patent-app"
echo.
pause
