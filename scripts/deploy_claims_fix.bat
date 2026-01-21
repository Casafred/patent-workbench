@echo off
chcp 65001 >nul
echo ========================================
echo 功能七行号和轮询修复 - 快速部署
echo ========================================
echo.

echo [1/4] 添加修改的文件到Git...
git add js/claimsProcessorIntegrated.js
git add docs/fixes/功能七行号和轮询修复.md
git add scripts/deploy_claims_fix.bat

echo.
echo [2/4] 提交更改...
git commit -m "修复功能七：改进轮询机制和行号显示

- 增加任务完成后的延迟时间（500ms -> 1500ms）
- 优化轮询间隔（更快响应）
- 添加结果加载重试机制（最多3次）
- 添加连续错误处理
- 修复行号显示：所有位置统一+1
- 修复行号传递逻辑
- 改进用户体验和错误提示"

echo.
echo [3/4] 推送到GitHub...
git push origin main

echo.
echo [4/4] 部署完成！
echo.
echo ========================================
echo 后续步骤：
echo ========================================
echo 1. 等待Render自动部署（约2-3分钟）
echo 2. 访问 https://patent-workbench-backend.onrender.com
echo 3. 清除浏览器缓存（Ctrl+Shift+Delete）或强制刷新（Ctrl+F5）
echo 4. 测试功能七的上传和处理功能
echo 5. 验证行号显示是否正确（从1开始）
echo 6. 验证首次处理是否成功
echo.
echo 测试要点：
echo - 上传Excel文件并处理
echo - 观察进度条到100%后是否正确显示结果
echo - 检查独权合并表格中的行号
echo - 搜索专利号并查看行号
echo - 点击"查看引用图"验证功能
echo ========================================
echo.

pause
