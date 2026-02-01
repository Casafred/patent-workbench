@echo off
chcp 65001 >nul
echo ========================================
echo 本地远程更新阿里云服务器
echo ========================================
echo.

set SERVER_IP=43.99.101.195
set PROJECT_PATH=/www/wwwroot/patent-workbench

echo 服务器IP: %SERVER_IP%
echo 项目路径: %PROJECT_PATH%
echo.

echo [1/3] 连接服务器并拉取代码...
ssh root@%SERVER_IP% "cd %PROJECT_PATH% && git pull origin main && echo '代码已更新'"
if errorlevel 1 (
    echo.
    echo 拉取main分支失败，尝试master分支...
    ssh root@%SERVER_IP% "cd %PROJECT_PATH% && git pull origin master && echo '代码已更新'"
    if errorlevel 1 (
        echo.
        echo ✗ 拉取失败，请检查：
        echo   1. SSH连接是否正常
        echo   2. 服务器上是否有未提交的修改
        echo   3. 网络连接是否正常
        pause
        exit /b 1
    )
)

echo.
echo [2/3] 检查并修复配置文件...
ssh root@%SERVER_IP% "cd %PROJECT_PATH% && if grep -q '127.0.0.1:5000' gunicorn_config.py; then sed -i 's/127.0.0.1:5000/0.0.0.0:5000/g' gunicorn_config.py && echo '配置已修复'; else echo '配置正常'; fi"

echo.
echo [3/3] 重启服务...
ssh root@%SERVER_IP% "systemctl restart gunicorn && echo '服务已重启'"
if errorlevel 1 (
    echo.
    echo ✗ 重启失败，请手动检查
    pause
    exit /b 1
)

echo.
echo ========================================
echo ✓ 更新完成！
echo ========================================
echo.
echo 验证步骤：
echo 1. 清除浏览器缓存（Ctrl+Shift+Delete）
echo 2. 访问网站测试功能八
echo.
echo 如需查看服务器状态，执行：
echo   ssh root@%SERVER_IP% "systemctl status gunicorn"
echo.

pause
