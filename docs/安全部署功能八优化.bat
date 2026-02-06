@echo off
chcp 65001 >nul
echo ========================================
echo 功能八 OCR标注优化 - 安全部署脚本
echo ========================================
echo.

echo [安全检查] 确保不会提交服务器配置文件
echo.

echo [1/6] 检查当前状态...
git status
echo.

echo [2/6] 只添加功能八优化相关的文件...
git add .gitignore
git add frontend/js/drawingMarkerInteractive.js
git add frontend/index.html
git add test_interactive_marker.html
git add 功能八OCR标注优化完成.md
git add 功能八优化-快速参考.md
git add 功能八优化-视觉对比.md
git add 测试功能八优化.bat
git add 部署功能八优化.bat
git add 安全部署功能八优化.bat
git add git_commit_ocr_optimization.txt
echo ✓ 文件已添加
echo.

echo [3/6] 确认要提交的文件...
echo.
git diff --cached --name-only
echo.

set /p confirm="确认以上文件无误？(y/n): "
if /i not "%confirm%"=="y" (
    echo 取消部署
    git reset HEAD
    pause
    exit /b 1
)

echo.
echo [4/6] 提交更改...
git commit -F git_commit_ocr_optimization.txt
if errorlevel 1 (
    echo ✗ 提交失败
    pause
    exit /b 1
)
echo ✓ 提交完成
echo.

echo [5/6] 推送到GitHub...
git push origin main
if errorlevel 1 (
    echo ✗ 推送失败，请检查网络连接
    echo.
    echo 可能的原因：
    echo   1. 网络连接问题
    echo   2. 分支名称不对（可能是master而不是main）
    echo   3. 需要先pull远程更改
    echo.
    set /p retry="是否尝试推送到master分支？(y/n): "
    if /i "%retry%"=="y" (
        git push origin master
        if errorlevel 1 (
            echo ✗ 推送master分支也失败
            pause
            exit /b 1
        )
    ) else (
        pause
        exit /b 1
    )
)
echo ✓ 推送成功
echo.

echo [6/6] 部署完成！
echo.
echo ========================================
echo 推送成功！
echo ========================================
echo.
echo 已推送的文件：
echo   ✓ .gitignore (更新，排除服务器配置)
echo   ✓ frontend/js/drawingMarkerInteractive.js (核心JS)
echo   ✓ frontend/index.html (主界面)
echo   ✓ test_interactive_marker.html (测试页面)
echo   ✓ 功能八OCR标注优化完成.md (详细文档)
echo   ✓ 功能八优化-快速参考.md (快速参考)
echo   ✓ 功能八优化-视觉对比.md (视觉对比)
echo   ✓ 测试功能八优化.bat (测试脚本)
echo   ✓ 部署功能八优化.bat (部署脚本)
echo   ✓ 安全部署功能八优化.bat (本脚本)
echo   ✓ git_commit_ocr_optimization.txt (提交信息)
echo.
echo 未推送的文件（服务器配置）：
echo   ✗ gunicorn_config.py (已排除)
echo   ✗ Nginx相关配置文件 (已排除)
echo   ✗ 服务器诊断脚本 (已排除)
echo.
echo 后续步骤：
echo   1. 在阿里云服务器上执行：
echo      cd /www/wwwroot/patent-workbench
echo      git pull
echo.
echo   2. 重启服务：
echo      sudo systemctl restart gunicorn
echo.
echo   3. 清除浏览器缓存测试
echo.

pause
