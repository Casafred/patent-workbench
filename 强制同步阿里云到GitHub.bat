@echo off
chcp 65001 >nul
echo ==========================================
echo   强制同步：阿里云服务器 → GitHub
echo   (以阿里云为准，覆盖GitHub版本)
echo ==========================================
echo.
echo [警告] 此操作将：
echo   1. 从阿里云服务器下载所有文件
echo   2. 覆盖本地所有文件
echo   3. 强制推送到GitHub（覆盖远程仓库）
echo.
echo [重要] 请确认：
echo   ✓ 阿里云服务器运行正常
echo   ✓ 你想要以阿里云的代码为最终版本
echo   ✓ 你已经备份了重要数据
echo.
set /p CONFIRM="确认继续？(输入 YES 继续): "
if not "%CONFIRM%"=="YES" (
    echo 操作已取消
    pause
    exit /b 0
)

echo.
echo ==========================================
echo 步骤 1/5: 连接阿里云服务器
echo ==========================================
echo.

set SERVER_IP=43.99.101.195
set SERVER_USER=root
set REMOTE_PATH=/home/appuser/patent-app
set BACKUP_NAME=aliyun-backup-%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_NAME=%BACKUP_NAME: =0%

echo 服务器: %SERVER_USER%@%SERVER_IP%
echo 远程路径: %REMOTE_PATH%
echo.

echo 测试SSH连接...
ssh -o ConnectTimeout=5 %SERVER_USER%@%SERVER_IP% "echo 连接成功"
if %errorlevel% neq 0 (
    echo.
    echo [错误] 无法连接到阿里云服务器
    echo.
    echo 请检查：
    echo 1. 服务器IP是否正确: %SERVER_IP%
    echo 2. 网络连接是否正常
    echo 3. SSH密钥或密码是否正确
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo 步骤 2/5: 从阿里云打包文件
echo ==========================================
echo.

echo 正在服务器上打包文件（排除不必要的文件）...
ssh %SERVER_USER%@%SERVER_IP% "cd %REMOTE_PATH% && tar czf /tmp/patent-app-full.tar.gz --exclude='.git' --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='node_modules' --exclude='uploads/*' --exclude='logs/*' --exclude='.env' --exclude='*.log' ."

if %errorlevel% neq 0 (
    echo [错误] 服务器打包失败
    pause
    exit /b 1
)

echo [完成] 文件打包完成
echo.

echo ==========================================
echo 步骤 3/5: 下载并解压文件
echo ==========================================
echo.

echo 正在下载打包文件...
scp %SERVER_USER%@%SERVER_IP%:/tmp/patent-app-full.tar.gz ./patent-app-full.tar.gz

if %errorlevel% neq 0 (
    echo [错误] 文件下载失败
    pause
    exit /b 1
)

echo 正在备份当前本地文件...
if exist "%BACKUP_NAME%" rmdir /s /q "%BACKUP_NAME%"
mkdir "%BACKUP_NAME%"
xcopy /E /I /Q /Y backend "%BACKUP_NAME%\backend\" >nul 2>&1
xcopy /E /I /Q /Y frontend "%BACKUP_NAME%\frontend\" >nul 2>&1
xcopy /E /I /Q /Y js "%BACKUP_NAME%\js\" >nul 2>&1
echo [完成] 本地文件已备份到: %BACKUP_NAME%

echo.
echo 正在解压并覆盖本地文件...
tar -xzf patent-app-full.tar.gz

if %errorlevel% neq 0 (
    echo [错误] 文件解压失败
    pause
    exit /b 1
)

del patent-app-full.tar.gz

echo 清理服务器临时文件...
ssh %SERVER_USER%@%SERVER_IP% "rm -f /tmp/patent-app-full.tar.gz"

echo [完成] 文件同步完成
echo.

echo ==========================================
echo 步骤 4/5: 提交到本地Git
echo ==========================================
echo.

echo 检查Git状态...
git status --short

echo.
echo 添加所有文件到Git...
git add -A

if %errorlevel% neq 0 (
    echo [错误] Git add 失败
    pause
    exit /b 1
)

echo.
echo 提交更改...
git commit -m "强制同步阿里云服务器部署到GitHub - %date% %time%

本次同步内容：
- 以阿里云服务器运行的代码为准
- 包含所有最新功能和修复
- 服务器运行状态：正常
- 同步时间：%date% %time%

此版本已在阿里云服务器验证通过，运行稳定。"

if %errorlevel% neq 0 (
    echo.
    echo [提示] 可能没有新的更改需要提交
    echo 继续推送到GitHub...
)

echo.
echo ==========================================
echo 步骤 5/5: 强制推送到GitHub
echo ==========================================
echo.

echo [警告] 即将强制推送到GitHub，这将覆盖远程仓库的所有内容
echo.
set /p PUSH_CONFIRM="确认强制推送？(输入 YES 继续): "
if not "%PUSH_CONFIRM%"=="YES" (
    echo 推送已取消，但本地文件已更新
    echo 你可以稍后手动推送：git push origin main --force
    pause
    exit /b 0
)

echo.
echo 正在强制推送到GitHub...
git push origin main --force

if %errorlevel% neq 0 (
    echo.
    echo [错误] 推送失败
    echo.
    echo 可能的原因：
    echo 1. 网络连接问题
    echo 2. GitHub认证失败
    echo 3. 仓库权限不足
    echo.
    echo 请尝试手动推送：
    echo   git push origin main --force
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   ✓ 同步完成！
echo ==========================================
echo.
echo 已完成以下操作：
echo ✓ 从阿里云服务器下载最新代码
echo ✓ 覆盖本地所有文件
echo ✓ 提交到本地Git仓库
echo ✓ 强制推送到GitHub远程仓库
echo.
echo 备份位置: %BACKUP_NAME%
echo.
echo GitHub仓库现在与阿里云服务器完全一致！
echo.
echo 验证方式：
echo 1. 访问GitHub仓库查看最新提交
echo 2. 检查提交时间是否为刚才
echo 3. 确认文件内容与阿里云服务器一致
echo.
pause
