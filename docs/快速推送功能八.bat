@echo off
chcp 65001 >nul
echo ========================================
echo 功能八优化 - 快速推送
echo ========================================
echo.
echo 正在推送功能八优化到GitHub...
echo.

REM 添加所有功能八相关文件
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
git add 推送前安全检查清单.md
git add 安全检查完成-可以推送.md
git add 快速推送功能八.bat

REM 提交
git commit -F git_commit_ocr_optimization.txt

REM 推送
git push origin main
if errorlevel 1 (
    echo.
    echo 推送main分支失败，尝试master分支...
    git push origin master
)

echo.
echo ========================================
echo 推送完成！
echo ========================================
echo.
pause
