@echo off
chcp 65001 >nul
echo ==========================================
echo   阿里云服务器 → 本地 → GitHub 完整同步
echo ==========================================
echo.

set SERVER_IP=43.99.101.195
set SERVER_USER=root
set REMOTE_PATH=/home/appuser/patent-app

echo 此脚本将执行以下操作：
echo 1. 从阿里云服务器拉取最新文件
echo 2. 提交到本地Git仓库
echo 3. 推送到GitHub远程仓库
echo.
echo 服务器: %SERVER_USER%@%SERVER_IP%
echo.
pause

echo.
echo ==========================================
echo 步骤 1/3: 从阿里云服务器拉取文件
echo ==========================================
echo.
echo 请输入服务器密码：

REM 使用SSH命令获取服务器上的文件列表并同步
ssh %SERVER_USER%@%SERVER_IP% "cd %REMOTE_PATH% && tar czf /tmp/patent-app-sync.tar.gz --exclude='.git' --exclude='venv' --exclude='__pycache__' --exclude='*.pyc' --exclude='node_modules' --exclude='uploads/*' --exclude='logs/*' ."

if %errorlevel% neq 0 (
    echo [错误] 无法连接到服务器或打包文件失败
    pause
    exit /b 1
)

echo 正在下载打包文件...
scp %SERVER_USER%@%SERVER_IP%:/tmp/patent-app-sync.tar.gz ./patent-app-sync.tar.gz

if %errorlevel% neq 0 (
    echo [错误] 文件下载失败
    pause
    exit /b 1
)

echo 正在解压文件...
tar -xzf patent-app-sync.tar.gz

if %errorlevel% neq 0 (
    echo [错误] 文件解压失败
    pause
    exit /b 1
)

del patent-app-sync.tar.gz

echo 清理服务器临时文件...
ssh %SERVER_USER%@%SERVER_IP% "rm -f /tmp/patent-app-sync.tar.gz"

echo.
echo [完成] 文件同步完成！
echo.

echo ==========================================
echo 步骤 2/3: 提交到本地Git仓库
echo ==========================================
echo.

git add -A

if %errorlevel% neq 0 (
    echo [错误] Git add 失败
    pause
    exit /b 1
)

echo 请输入提交信息（直接回车使用默认信息）：
set /p COMMIT_MSG="提交信息: "

if "%COMMIT_MSG%"=="" (
    set COMMIT_MSG=从阿里云服务器同步最新部署 - %date% %time%
)

git commit -m "%COMMIT_MSG%"

if %errorlevel% neq 0 (
    echo [警告] 可能没有文件需要提交，或提交失败
    echo 继续推送...
)

echo.
echo [完成] 本地提交完成！
echo.

echo ==========================================
echo 步骤 3/3: 推送到GitHub
echo ==========================================
echo.

git push origin main

if %errorlevel% neq 0 (
    echo [错误] 推送到GitHub失败
    echo.
    echo 可能的原因：
    echo 1. 网络连接问题
    echo 2. 没有推送权限
    echo 3. 需要先拉取远程更新
    echo.
    echo 请尝试手动推送：
    echo   git pull origin main
    echo   git push origin main
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   ✓ 同步完成！
echo ==========================================
echo.
echo 已完成以下操作：
echo ✓ 从阿里云服务器拉取最新文件
echo ✓ 提交到本地Git仓库
echo ✓ 推送到GitHub远程仓库
echo.
echo GitHub仓库现在与阿里云服务器保持同步！
echo.
pause
