@echo off
chcp 65001 >nul
echo ========================================
echo 远程更新阿里云服务器 - 正确版本
echo ========================================
echo.

set SERVER_IP=43.99.101.195
set PROJECT_PATH=/home/appuser/patent-app
set SERVICE_NAME=patent-app

echo 服务器IP: %SERVER_IP%
echo 项目路径: %PROJECT_PATH%
echo 服务名称: %SERVICE_NAME%
echo.

echo [1/4] 拉取最新代码...
ssh root@%SERVER_IP% "cd %PROJECT_PATH% && git pull origin main"
if errorlevel 1 (
    echo.
    echo ⚠ main分支拉取失败，尝试master分支...
    ssh root@%SERVER_IP% "cd %PROJECT_PATH% && git pull origin master"
    if errorlevel 1 (
        echo.
        echo ✗ 拉取失败
        pause
        exit /b 1
    )
)
echo ✓ 代码已更新
echo.

echo [2/4] 修复文件权限...
ssh root@%SERVER_IP% "chown -R appuser:appuser %PROJECT_PATH%"
echo ✓ 权限已修复
echo.

echo [3/4] 重启服务...
ssh root@%SERVER_IP% "systemctl restart %SERVICE_NAME%"
if errorlevel 1 (
    echo ✗ 重启失败
    pause
    exit /b 1
)
echo ✓ 服务已重启
echo.

echo [4/4] 验证服务状态...
timeout /t 3 /nobreak >nul
ssh root@%SERVER_IP% "systemctl status %SERVICE_NAME% | grep Active"
echo.

ssh root@%SERVER_IP% "netstat -tlnp | grep 5000"
echo.

echo ========================================
echo ✓ 更新完成！
echo ========================================
echo.
echo 后续步骤：
echo   1. 清除浏览器缓存（Ctrl+Shift+Delete）
echo   2. 访问 http://%SERVER_IP%
echo   3. 测试功能八的新功能
echo.

pause
