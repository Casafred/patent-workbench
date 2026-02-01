@echo off
chcp 65001 >nul
echo ========================================
echo 远程更新阿里云服务器 - 功能八优化
echo ========================================
echo.

REM 配置
set SERVER_IP=43.99.101.195
set PROJECT_PATH=/www/wwwroot/patent-workbench

echo 目标服务器: %SERVER_IP%
echo 项目路径: %PROJECT_PATH%
echo.

REM 检查SSH连接
echo [测试] 检查SSH连接...
ssh -o ConnectTimeout=5 root@%SERVER_IP% "echo 'SSH连接正常'" >nul 2>&1
if errorlevel 1 (
    echo ✗ SSH连接失败
    echo.
    echo 可能的原因：
    echo   1. 服务器IP不正确
    echo   2. SSH密钥未配置
    echo   3. 网络连接问题
    echo.
    echo 请先配置SSH密钥：
    echo   ssh-keygen -t rsa
    echo   ssh-copy-id root@%SERVER_IP%
    echo.
    pause
    exit /b 1
)
echo ✓ SSH连接正常
echo.

REM 拉取代码
echo [1/4] 拉取最新代码...
ssh root@%SERVER_IP% "cd %PROJECT_PATH% && git pull origin main 2>&1"
if errorlevel 1 (
    echo.
    echo ⚠ main分支拉取失败，尝试master分支...
    ssh root@%SERVER_IP% "cd %PROJECT_PATH% && git pull origin master 2>&1"
    if errorlevel 1 (
        echo.
        echo ✗ 拉取失败
        echo.
        echo 请手动检查：
        echo   ssh root@%SERVER_IP%
        echo   cd %PROJECT_PATH%
        echo   git status
        echo.
        pause
        exit /b 1
    )
)
echo ✓ 代码已更新
echo.

REM 检查配置
echo [2/4] 检查配置文件...
ssh root@%SERVER_IP% "cd %PROJECT_PATH% && cat gunicorn_config.py | grep bind"
echo.

REM 修复配置
echo [3/4] 修复配置（如需要）...
ssh root@%SERVER_IP% "cd %PROJECT_PATH% && if grep -q '127.0.0.1:5000' gunicorn_config.py; then sed -i 's/127.0.0.1:5000/0.0.0.0:5000/g' gunicorn_config.py && echo '✓ 配置已修复为 0.0.0.0:5000'; else echo '✓ 配置正常'; fi"
echo.

REM 重启服务
echo [4/4] 重启Gunicorn服务...
ssh root@%SERVER_IP% "systemctl restart gunicorn"
if errorlevel 1 (
    echo ✗ 重启失败
    echo.
    echo 查看日志：
    echo   ssh root@%SERVER_IP% "journalctl -u gunicorn -n 50"
    echo.
    pause
    exit /b 1
)
echo ✓ 服务已重启
echo.

REM 等待服务启动
echo 等待服务启动...
timeout /t 3 /nobreak >nul
echo.

REM 验证状态
echo [验证] 检查服务状态...
ssh root@%SERVER_IP% "systemctl status gunicorn | grep Active"
echo.

echo [验证] 检查端口监听...
ssh root@%SERVER_IP% "netstat -tlnp | grep 5000"
echo.

echo [验证] 查看最新提交...
ssh root@%SERVER_IP% "cd %PROJECT_PATH% && git log --oneline -1"
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
echo 测试清单：
echo   □ 图片高清显示
echo   □ 鼠标滚轮缩放
echo   □ +/- 按钮缩放
echo   □ 弹窗查看功能
echo   □ 标注框清晰度
echo.
echo 如需查看实时日志：
echo   ssh root@%SERVER_IP% "journalctl -u gunicorn -f"
echo.

pause
