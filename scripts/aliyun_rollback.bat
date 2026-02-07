@echo off
REM 阿里云服务器安全回退脚本 (Windows版本)
REM 使用方法: scripts\aliyun_rollback.bat [commit_hash]
REM 如果不提供commit_hash，则回退到上一个版本

setlocal enabledelayedexpansion

echo ========================================
echo   阿里云服务器安全回退工具
echo ========================================
echo.

REM 服务器配置
set SERVER_IP=43.99.101.195
set SERVER_USER=root
set PROJECT_PATH=/home/appuser/patent-app
set SERVICE_NAME=patent-app

REM 检查是否提供了commit hash
set COMMIT_HASH=%1

if "%COMMIT_HASH%"=="" (
    echo [警告] 未提供commit hash，将回退到上一个版本
    set ROLLBACK_CMD=git reset --hard HEAD~1
) else (
    echo [信息] 将回退到指定版本: %COMMIT_HASH%
    set ROLLBACK_CMD=git reset --hard %COMMIT_HASH%
)

echo.
echo 准备执行以下操作:
echo 1. 连接到服务器: %SERVER_USER%@%SERVER_IP%
echo 2. 进入项目目录: %PROJECT_PATH%
echo 3. 创建紧急备份分支
echo 4. 执行回退: %ROLLBACK_CMD%
echo 5. 重启服务: %SERVICE_NAME%
echo 6. 验证服务状态
echo.

set /p CONFIRM="确认执行回退操作? (yes/no): "

if /i not "%CONFIRM%"=="yes" (
    echo [错误] 操作已取消
    exit /b 1
)

echo.
echo [信息] 开始执行回退...
echo.

REM 执行回退
ssh %SERVER_USER%@%SERVER_IP% "cd %PROJECT_PATH% && echo '=========================================' && echo '1. 查看当前版本' && echo '=========================================' && git log -1 --oneline && echo '' && echo '=========================================' && echo '2. 创建紧急备份分支' && echo '=========================================' && git branch emergency-backup-$(date +%%Y%%m%%d-%%H%%M%%S) && echo '✓ 已创建备份分支' && echo '' && echo '=========================================' && echo '3. 执行回退' && echo '=========================================' && %ROLLBACK_CMD% && echo '✓ 回退完成' && echo '' && echo '回退后的版本:' && git log -1 --oneline && echo '' && echo '=========================================' && echo '4. 重启服务' && echo '=========================================' && systemctl restart %SERVICE_NAME% && sleep 3 && echo '✓ 服务已重启' && echo '' && echo '=========================================' && echo '5. 验证服务状态' && echo '=========================================' && systemctl status %SERVICE_NAME% --no-pager -l"

echo.
echo ========================================
echo   回退操作完成！
echo ========================================
echo.
echo 后续步骤:
echo 1. 访问网站验证功能: https://ipx.asia
echo 2. 查看错误日志: ssh %SERVER_USER%@%SERVER_IP% "tail -f %PROJECT_PATH%/logs/error.log"
echo 3. 如果需要恢复，可以切换到备份分支
echo.
echo 查看所有备份分支:
echo ssh %SERVER_USER%@%SERVER_IP% "cd %PROJECT_PATH% && git branch | grep emergency-backup"
echo.

pause
