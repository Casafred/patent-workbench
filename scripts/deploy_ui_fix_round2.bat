@echo off
chcp 65001 >nul
echo ========================================
echo UI优化第二轮修复 - 快速部署
echo ========================================
echo.

echo [1/4] 添加所有修改文件...
git add frontend/css/pages/chat.css
git add frontend/index.html
git add js/main.js
git add fix_emoji_buttons.js
git add UI优化第二轮修复完成.md
git add scripts/deploy_ui_fix_round2.bat

echo.
echo [2/4] 提交更改...
git commit -m "UI优化第二轮：修复用户消息布局、优化Markdown显示、替换功能六emoji、修复问一问弹窗"

echo.
echo [3/4] 推送到远程仓库...
git push origin main

echo.
echo [4/4] 部署完成！
echo.
echo ========================================
echo 修复内容总结：
echo ========================================
echo ✅ 用户消息改为左对齐
echo ✅ 优化Markdown显示效果
echo ✅ 功能六所有emoji替换为SVG
echo ✅ 修复问一问弹窗闪现问题
echo ✅ 移除遮罩层，弹窗可拖动
echo.
echo ========================================
echo 测试步骤：
echo ========================================
echo 1. 清除浏览器缓存 (Ctrl + Shift + Delete)
echo 2. 刷新页面 (Ctrl + F5)
echo 3. 测试功能一：检查消息布局和Markdown
echo 4. 测试功能六：检查按钮图标
echo 5. 测试问一问：检查弹窗行为
echo.
echo 📋 详细说明：UI优化第二轮修复完成.md
echo ========================================
echo.
pause
