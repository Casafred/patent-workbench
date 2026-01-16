@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo   快速推送到 GitHub 仓库
echo   https://github.com/Casafred/patent-workbench
echo ==========================================
echo.

REM 设置仓库地址
set "REPO_URL=https://github.com/Casafred/patent-workbench.git"

echo [步骤 1/6] 检查 Git 是否安装...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Git 未安装
    echo 请访问 https://git-scm.com/download/win 下载安装
    pause
    exit /b 1
)
echo ✓ Git 已安装
echo.

echo [步骤 2/6] 初始化 Git 仓库...
if not exist .git (
    git init
    echo ✓ Git 仓库已初始化
) else (
    echo ✓ Git 仓库已存在
)
echo.

echo [步骤 3/6] 配置远程仓库...
git remote -v | findstr "origin" >nul 2>&1
if %errorlevel% neq 0 (
    git remote add origin %REPO_URL%
    echo ✓ 已添加远程仓库
) else (
    git remote set-url origin %REPO_URL%
    echo ✓ 已更新远程仓库地址
)
echo.

echo 当前远程仓库:
git remote -v
echo.

echo [步骤 4/6] 添加所有文件...
git add .
echo ✓ 文件已添加
echo.

echo [步骤 5/6] 提交更改...
git commit -m "Deploy Patent Analysis Workbench - Complete refactored version"
if %errorlevel% neq 0 (
    echo ⚠️  没有新的更改需要提交，或提交失败
    echo 继续推送现有提交...
)
echo.

echo [步骤 6/6] 推送到 GitHub...
echo.
echo ⚠️  注意: 这将强制替换远程仓库的内容
echo.
set /p "confirm=确认要推送吗? (y/n): "
if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    exit /b 0
)

echo.
echo 正在推送到 GitHub...
echo 如果提示需要登录:
echo   - 用户名: 你的 GitHub 用户名
echo   - 密码: 你的 Personal Access Token (不是密码)
echo.

REM 先尝试设置主分支为 main
git branch -M main

REM 推送到 GitHub
git push -u origin main -f

if %errorlevel% equ 0 (
    echo.
    echo ==========================================
    echo   ✓ 成功推送到 GitHub!
    echo ==========================================
    echo.
    echo 你的仓库: https://github.com/Casafred/patent-workbench
    echo.
    echo 下一步:
    echo 1. 访问 GitHub 仓库验证文件已上传
    echo 2. 登录 Render Dashboard 查看部署状态
    echo 3. 配置环境变量 ZHIPUAI_API_KEY
    echo 4. 等待部署完成 (3-5 分钟)
    echo.
) else (
    echo.
    echo ==========================================
    echo   ❌ 推送失败
    echo ==========================================
    echo.
    echo 可能的原因:
    echo 1. 需要身份验证 - 使用 Personal Access Token
    echo 2. 网络连接问题
    echo 3. 仓库权限问题
    echo.
    echo 获取 Personal Access Token:
    echo 1. 访问 https://github.com/settings/tokens
    echo 2. 点击 "Generate new token (classic)"
    echo 3. 勾选 "repo" 权限
    echo 4. 生成并复制 token
    echo 5. 重新运行此脚本，使用 token 作为密码
    echo.
)

pause
