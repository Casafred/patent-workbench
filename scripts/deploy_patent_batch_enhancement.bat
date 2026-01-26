@echo off
chcp 65001 >nul
echo ========================================
echo 功能六增强部署脚本
echo ========================================
echo.

echo [1/5] 检查文件完整性...
if not exist "js\patentTemplate.js" (
    echo ❌ 错误：js\patentTemplate.js 不存在
    pause
    exit /b 1
)
if not exist "js\patentChat.js" (
    echo ❌ 错误：js\patentChat.js 不存在
    pause
    exit /b 1
)
if not exist "frontend\css\components\patent-template.css" (
    echo ❌ 错误：frontend\css\components\patent-template.css 不存在
    pause
    exit /b 1
)
if not exist "frontend\css\components\patent-chat.css" (
    echo ❌ 错误：frontend\css\components\patent-chat.css 不存在
    pause
    exit /b 1
)
echo ✅ 所有文件完整

echo.
echo [2/5] 添加文件到Git...
git add js/patentTemplate.js
git add js/patentChat.js
git add frontend/css/components/patent-template.css
git add frontend/css/components/patent-chat.css
git add frontend/index.html
git add js/main.js
git add js/state.js
git add backend/routes/patent.py
git add .kiro/specs/patent-batch-enhancement/
git add 功能六增强*.md
echo ✅ 文件已添加

echo.
echo [3/5] 提交更改...
git commit -m "功能六增强：自定义解读模板和专利对话功能

新增功能：
1. 自定义解读模板系统
   - 4个预设模板（默认、技术分析、商业价值、法律分析）
   - 自定义字段配置
   - 模板导入/导出
   - 解读结果动态适配

2. 专利问一问对话功能
   - 针对单个专利自由提问
   - 多轮对话支持
   - 对话历史管理
   - 对话导出功能

技术实现：
- 新增 js/patentTemplate.js 模板管理模块
- 新增 js/patentChat.js 对话功能模块
- 新增 CSS 样式文件
- 更新 frontend/index.html 界面
- 更新 js/main.js 功能六逻辑
- 更新 backend/routes/patent.py API
- 更新 js/state.js 状态管理

文档：
- 需求和设计文档
- 实现进度文档
- 完成总结文档
- 测试指南文档"

if errorlevel 1 (
    echo ⚠️ 没有需要提交的更改或提交失败
) else (
    echo ✅ 更改已提交
)

echo.
echo [4/5] 推送到远程仓库...
git push origin main
if errorlevel 1 (
    echo ❌ 推送失败，请检查网络连接和权限
    pause
    exit /b 1
)
echo ✅ 推送成功

echo.
echo [5/5] 部署完成！
echo.
echo ========================================
echo 📋 部署信息
echo ========================================
echo 新增文件：
echo   - js/patentTemplate.js
echo   - js/patentChat.js
echo   - frontend/css/components/patent-template.css
echo   - frontend/css/components/patent-chat.css
echo.
echo 修改文件：
echo   - frontend/index.html
echo   - js/main.js
echo   - js/state.js
echo   - backend/routes/patent.py
echo.
echo 新增功能：
echo   ✅ 自定义解读模板系统
echo   ✅ 专利问一问对话功能
echo.
echo ========================================
echo 📖 后续步骤
echo ========================================
echo 1. 等待自动部署完成（Render/阿里云）
echo 2. 访问网站测试功能
echo 3. 参考"功能六增强测试指南.md"进行测试
echo 4. 如有问题，查看"功能六增强完成总结.md"
echo.
echo 测试地址：
echo   - Render: https://patent-workbench-backend.onrender.com
echo   - 阿里云: http://your-aliyun-ip
echo.
echo ========================================

pause
