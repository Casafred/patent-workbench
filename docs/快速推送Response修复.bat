@echo off
chcp 65001 >nul
echo ========================================
echo 快速推送 Response.text 修复
echo ========================================
echo.
echo 修复内容：
echo - 修复 Response.text 已被消费的错误
echo - 使用 response.clone() 解决多次读取问题
echo.
echo ========================================
echo 开始推送...
echo ========================================
echo.

git add js/main.js
git add 控制台错误分析和修复_第二轮.md
git add 快速推送Response修复.bat

git commit -m "修复Response.text已被消费的错误

- 在apiCall函数中使用response.clone()避免body被重复消费
- 修复/patent/version API调用失败的问题
- 添加更完善的错误处理逻辑

修改文件：
- js/main.js - 修复Response读取逻辑
- 控制台错误分析和修复_第二轮.md - 详细问题分析"

echo.
echo ========================================
echo 推送到GitHub...
echo ========================================
echo.

git push origin main

echo.
echo ========================================
echo ✅ 推送完成！
echo ========================================
echo.
echo 下一步操作：
echo 1. 清除浏览器缓存 (Ctrl+Shift+Delete)
echo 2. 强制刷新页面 (Ctrl+F5)
echo 3. 部署到阿里云: .\阿里云拉取移动端更新.bat
echo.
pause
