@echo off
chcp 65001 >nul
echo ==========================================
echo   从阿里云服务器同步文件到本地
echo ==========================================
echo.

set SERVER_IP=43.99.101.195
set SERVER_USER=root
set REMOTE_PATH=/home/appuser/patent-app
set LOCAL_PATH=%cd%

echo 服务器地址: %SERVER_USER%@%SERVER_IP%
echo 远程路径: %REMOTE_PATH%
echo 本地路径: %LOCAL_PATH%
echo.
echo 准备从服务器拉取最新文件...
echo.

REM 使用rsync同步文件（需要安装Git Bash或WSL）
echo 正在同步文件...
echo.

REM 方法1：使用scp批量下载（推荐）
echo 请输入服务器密码：
scp -r %SERVER_USER%@%SERVER_IP%:%REMOTE_PATH%/* %LOCAL_PATH%/

if %errorlevel% neq 0 (
    echo.
    echo [错误] 文件同步失败！
    echo.
    echo 可能的原因：
    echo 1. 没有安装SSH客户端
    echo 2. 服务器连接失败
    echo 3. 密码错误
    echo.
    echo 请尝试手动方式：
    echo 1. 使用WinSCP或FileZilla连接服务器
    echo 2. 下载 /home/appuser/patent-app 目录下的所有文件
    echo 3. 覆盖到本地项目目录
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   文件同步完成！
echo ==========================================
echo.
echo 接下来请运行：
echo   git add -A
echo   git commit -m "从阿里云服务器同步最新部署"
echo   git push origin main
echo.
pause
