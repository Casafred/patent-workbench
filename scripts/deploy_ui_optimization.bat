@echo off
chcp 65001 >nul
echo ========================================
echo UI优化修复 - 快速部署
echo ========================================
echo.

echo [1/5] 添加修改的文件...
git add frontend/css/base/variables.css
git add frontend/css/pages/chat.css
git add frontend/css/components/patent-chat.css
git add js/patentChat.js
git add js/main.js
git add UI优化修复说明.md
git add UI优化修复完成总结.md
git add UI优化验证清单.md
git add test_ui_optimization.html
git add 测试UI优化.bat
git add scripts/deploy_ui_optimization.bat

echo.
echo [2/5] 显示修改内容...
git status

echo.
echo [3/5] 提交更改...
git commit -m "UI优化：功能一用户消息改为绿底白字，功能六问一问按钮改为主题绿色，替换emoji为SVG，问一问弹窗改为可拖动悬浮窗"

echo.
echo [4/5] 推送到远程仓库...
git push origin main

echo.
echo [5/5] 部署完成！
echo.
echo ========================================
echo 修改内容总结：
echo ========================================
echo ✅ 功能一：用户消息改为绿底白字
echo ✅ 功能六：问一问按钮改为主题绿色
echo ✅ 全站：所有emoji替换为SVG图标
echo ✅ 弹窗：改为可拖动悬浮窗，移除遮罩层
echo.
echo ========================================
echo 测试清单：
echo ========================================
echo 1. 功能一：检查用户消息是否为绿底白字
echo 2. 功能六：检查问一问按钮是否为绿色
echo 3. 检查所有emoji是否已替换为SVG图标
echo 4. 测试问一问弹窗是否可以拖动
echo 5. 确认没有遮罩层
echo.
echo 📋 详细验证清单请查看：UI优化验证清单.md
echo 🧪 本地测试请运行：测试UI优化.bat
echo 📖 完整说明请查看：UI优化修复完成总结.md
echo ========================================
echo.
pause
