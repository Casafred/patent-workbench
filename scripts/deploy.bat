@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo   Patent Analysis Workbench - 部署助手
echo ==========================================
echo.

REM 检查是否在 Git 仓库中
if not exist .git (
    echo ❌ 错误: 当前目录不是 Git 仓库
    echo 请先运行: git init
    pause
    exit /b 1
)

echo ✓ Git 仓库检查通过
echo.

REM 检查关键文件
echo 检查关键文件...
set "missing=0"

if exist wsgi.py (
    echo   ✓ wsgi.py
) else (
    echo   ❌ wsgi.py ^(缺失^)
    set "missing=1"
)

if exist Procfile (
    echo   ✓ Procfile
) else (
    echo   ❌ Procfile ^(缺失^)
    set "missing=1"
)

if exist requirements.txt (
    echo   ✓ requirements.txt
) else (
    echo   ❌ requirements.txt ^(缺失^)
    set "missing=1"
)

if exist runtime.txt (
    echo   ✓ runtime.txt
) else (
    echo   ❌ runtime.txt ^(缺失^)
    set "missing=1"
)

if exist .gitignore (
    echo   ✓ .gitignore
) else (
    echo   ❌ .gitignore ^(缺失^)
    set "missing=1"
)

if "%missing%"=="1" (
    echo.
    echo ❌ 缺少必需文件，请先创建这些文件
    pause
    exit /b 1
)

echo.
echo ✓ 所有关键文件检查通过
echo.

REM 检查敏感文件
echo 检查敏感文件...
git ls-files | findstr /C:"users.json" >nul 2>&1
if %errorlevel% equ 0 (
    echo   ⚠️  警告: users.json 被 Git 追踪
    echo   建议运行: git rm --cached users.json
)

git ls-files | findstr /C:".env" >nul 2>&1
if %errorlevel% equ 0 (
    echo   ⚠️  警告: .env 被 Git 追踪
    echo   建议运行: git rm --cached .env
)

echo.

REM 显示当前状态
echo 当前 Git 状态:
git status --short
echo.

REM 询问是否继续
set /p "continue=是否要提交并推送代码? (y/n): "
if /i not "%continue%"=="y" (
    echo 部署已取消
    pause
    exit /b 0
)

REM 获取提交信息
set /p "commit_msg=请输入提交信息 (默认: Deploy to Render): "
if "%commit_msg%"=="" set "commit_msg=Deploy to Render"

REM 添加所有文件
echo.
echo 添加文件到 Git...
git add .

REM 提交
echo 提交更改...
git commit -m "%commit_msg%"

REM 获取远程分支
set /p "branch=请输入要推送的分支 (默认: main): "
if "%branch%"=="" set "branch=main"

REM 推送
echo.
echo 推送到 GitHub...
git push origin %branch%

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo   ✓ 代码已成功推送到 GitHub!
    echo ==========================================
    echo.
    echo 下一步:
    echo 1. 登录 Render Dashboard
    echo 2. 检查部署状态
    echo 3. 配置环境变量（如果还没有）:
    echo    - ZHIPUAI_API_KEY
    echo    - FLASK_SECRET_KEY
    echo 4. 等待部署完成
    echo.
    echo 查看完整指南: QUICK_DEPLOY.md
) else (
    echo.
    echo ❌ 推送失败，请检查错误信息
)

echo.
pause
