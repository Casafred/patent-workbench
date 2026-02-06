@echo off
chcp 65001 >nul
echo ========================================
echo 第三轮错误修复 - 推送到GitHub
echo ========================================
echo.
echo 修复内容：
echo 1. ✅ /patent/version API 405错误
echo 2. ✅ 模板不存在错误（彻底修复）
echo 3. ✅ 问一问对话框支持Markdown渲染
echo.
echo ========================================
echo 开始推送...
echo ========================================
echo.

git add js/main.js
git add js/largeBatch.js
git add js/patentChat.js
git add 第三轮错误修复完成.md
git add 推送第三轮修复.bat

git commit -m "第三轮错误修复：API方法、模板初始化、Markdown渲染

修复内容：
1. 修复/patent/version API 405错误 - 使用GET方法
2. 彻底修复模板不存在错误 - 初始化时加载默认模板
3. 问一问对话框支持Markdown渲染 - 使用marked.js

修改文件：
- js/main.js - 修复API调用方法
- js/largeBatch.js - 修复模板初始化
- js/patentChat.js - 添加Markdown渲染支持

新功能：
- 问一问对话框现在支持完整的Markdown语法
- 包括粗体、斜体、列表、代码块、引用等
- 自动降级到简单格式化（如果marked.js不可用）"

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
echo 1. 部署到阿里云: .\阿里云拉取移动端更新.bat
echo 2. 清除浏览器缓存 (Ctrl+Shift+Delete)
echo 3. 强制刷新页面 (Ctrl+F5)
echo 4. 测试问一问功能的Markdown渲染
echo.
echo 测试Markdown渲染：
echo - 在问一问中提问："请用Markdown格式总结"
echo - AI回答应该正确显示粗体、斜体、列表等格式
echo - 不再显示 ** 等原始符号
echo.
pause
