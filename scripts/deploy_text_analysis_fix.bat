@echo off
chcp 65001 >nul
echo ========================================
echo 功能七文本分析修复 - 部署脚本
echo ========================================
echo.

echo [1/4] 检查 Git 状态...
git status

echo.
echo [2/4] 添加修改的文件...
git add frontend/index.html
git add 功能七文本分析修复完成.md
git add scripts/deploy_text_analysis_fix.bat

echo.
echo [3/4] 提交更改...
git commit -m "修复功能七文本分析：添加ClaimsVisualizationRenderer、优化按钮颜色、替换Emoji为SVG"

echo.
echo [4/4] 推送到远程仓库...
git push origin main

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 修复内容：
echo   ✓ 修复 ClaimsVisualizationRenderer 未定义错误
echo   ✓ 优化加载示例按钮颜色（蓝色→绿色）
echo   ✓ 替换所有 Emoji 为 SVG 图标
echo.
echo 请在 Render 上重新部署以应用更改。
echo.
pause
