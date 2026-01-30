@echo off
chcp 65001 >nul
echo ==========================================
echo   强制更新阿里云服务器
echo   (以GitHub为准，覆盖服务器代码)
echo ==========================================
echo.
echo [操作说明]
echo 此脚本将：
echo 1. 在服务器上备份当前代码
echo 2. 强制重置服务器代码为GitHub版本
echo 3. 重启应用服务
echo.
echo [重要] 服务器当前的本地修改将被丢弃！
echo.
set /p CONFIRM="确认继续？(输入 YES 继续): "
if not "%CONFIRM%"=="YES" (
    echo 操作已取消
    pause
    exit /b 0
)

echo.
echo ==========================================
echo 连接到阿里云服务器
echo ==========================================
echo.

set SERVER_IP=43.99.101.195
set SERVER_USER=root
set REMOTE_PATH=/home/appuser/patent-app

echo 服务器: %SERVER_USER%@%SERVER_IP%
echo.

echo 正在执行更新...
echo.

ssh %SERVER_USER%@%SERVER_IP% "
echo '=========================================='
echo '步骤 1/4: 备份当前代码'
echo '=========================================='
cd %REMOTE_PATH%
BACKUP_DIR=backup_\$(date +%%Y%%m%%d_%%H%%M%%S)
echo \"创建备份目录: \$BACKUP_DIR\"
mkdir -p ~/backups/\$BACKUP_DIR
cp -r backend frontend js config *.py *.txt ~/backups/\$BACKUP_DIR/ 2>/dev/null || true
echo '✓ 备份完成'
echo ''

echo '=========================================='
echo '步骤 2/4: 重置为GitHub版本'
echo '=========================================='
su - appuser -c '
    cd ~/patent-app
    echo \"当前分支: \$(git branch --show-current)\"
    echo \"丢弃本地修改...\"
    git reset --hard HEAD
    git clean -fd
    echo \"拉取GitHub最新代码...\"
    git fetch origin
    git reset --hard origin/main
    echo \"✓ 代码已更新为GitHub版本\"
'
echo ''

echo '=========================================='
echo '步骤 3/4: 检查Python依赖'
echo '=========================================='
su - appuser -c '
    cd ~/patent-app
    source venv/bin/activate
    echo \"检查依赖更新...\"
    pip install -r requirements.txt --quiet
    echo \"✓ 依赖检查完成\"
'
echo ''

echo '=========================================='
echo '步骤 4/4: 重启应用'
echo '=========================================='
systemctl restart patent-app
sleep 3
systemctl status patent-app --no-pager | head -15
echo ''

echo '=========================================='
echo '✓ 更新完成！'
echo '=========================================='
echo ''
echo \"备份位置: ~/backups/\$BACKUP_DIR\"
echo \"访问地址: http://%SERVER_IP%\"
echo ''
"

if %errorlevel% neq 0 (
    echo.
    echo [错误] 更新失败
    echo.
    echo 请检查：
    echo 1. SSH连接是否正常
    echo 2. 服务器权限是否正确
    echo 3. Git仓库状态是否正常
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   ✓ 阿里云服务器更新完成！
echo ==========================================
echo.
echo 已完成：
echo ✓ 备份服务器原有代码
echo ✓ 强制重置为GitHub版本
echo ✓ 更新Python依赖
echo ✓ 重启应用服务
echo.
echo 验证方式：
echo 1. 访问 http://%SERVER_IP%
echo 2. 测试所有功能是否正常
echo 3. 查看日志：ssh %SERVER_USER%@%SERVER_IP% "tail -f %REMOTE_PATH%/logs/error.log"
echo.
pause
