@echo off
chcp 65001 >nul
echo ========================================
echo 功能六UI优化 - 快速部署脚本
echo ========================================
echo.

echo [1/4] 检查Git状态...
git status
echo.

echo [2/4] 添加修改的文件...
git add frontend/index.html
git add frontend/css/components/patent-config.css
git add js/main.js
git add js/patentBatchUI.js
git add test_patent_batch_ui.html
git add 功能六UI优化完成.md
git add scripts/deploy_patent_batch_ui.bat
echo ✓ 文件已添加
echo.

echo [3/4] 提交更改...
git commit -m "功能六UI优化：条带式展示+弹窗详情

优化内容：
1. 重构布局：输入框宽度减小，配置项横向排列
2. 添加公开号快捷复制按钮（多处）
3. 查询结果改为条带式展示（仅显示专利号）
4. 点击专利号弹窗展示完整详情
5. 优化响应式设计，支持移动端

新增文件：
- js/patentBatchUI.js - UI交互逻辑
- test_patent_batch_ui.html - UI测试页面
- 功能六UI优化完成.md - 说明文档

修改文件：
- frontend/index.html - 重构功能六HTML结构
- frontend/css/components/patent-config.css - 新增样式
- js/main.js - 更新事件监听"
echo ✓ 提交完成
echo.

echo [4/4] 推送到远程仓库...
git push origin main
if %errorlevel% neq 0 (
    echo ✗ 推送失败，请检查网络连接或权限
    pause
    exit /b 1
)
echo ✓ 推送成功
echo.

echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 后续步骤：
echo 1. 在服务器上执行: git pull origin main
echo 2. 清除浏览器缓存（Ctrl+Shift+Delete）
echo 3. 访问功能六测试新UI
echo.
echo 测试清单：
echo □ 布局是否正确（左右分栏）
echo □ 复制按钮是否工作
echo □ 条带点击是否打开弹窗
echo □ 弹窗内容是否完整
echo □ 移动端响应式是否正常
echo.
pause
