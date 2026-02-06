@echo off
chcp 65001 >nul
echo ========================================
echo 功能修复测试指南
echo ========================================
echo.
echo 本次修复内容：
echo 1. ✅ 模板加载错误修复
echo 2. ✅ 对话框消息布局修复（用户消息靠右）
echo 3. ✅ CSS属性错误修复
echo 4. ✅ JavaScript错误修复
echo 5. ✅ 功能六：AI模型选择器
echo 6. ✅ 问一问功能上下文增强
echo.
echo ========================================
echo 测试步骤：
echo ========================================
echo.
echo 【步骤1】清除浏览器缓存
echo   - Chrome: Ctrl+Shift+Delete
echo   - 选择"缓存的图片和文件"
echo   - 点击"清除数据"
echo.
echo 【步骤2】刷新页面
echo   - 按 Ctrl+F5 强制刷新
echo   - 或 Ctrl+Shift+R
echo.
echo 【步骤3】测试功能六模型选择
echo   1. 进入"批量专利查询与解读"标签页
echo   2. 查看是否有"AI解读模型"下拉框
echo   3. 输入测试专利号：CN104154208B
echo   4. 点击"批量查询专利"
echo   5. 选择不同的AI模型（如GLM-4-Plus）
echo   6. 点击"一键解读全部"
echo   7. 检查解读结果是否正常
echo.
echo 【步骤4】测试问一问功能
echo   1. 在专利卡片上找到"问一问"按钮
echo   2. 点击打开对话窗口
echo   3. 输入问题："这个专利的核心创新点是什么？"
echo   4. 点击发送
echo   5. 检查：
echo      - 用户消息是否靠右显示
echo      - AI回答是否基于专利内容
echo      - 控制台是否有错误
echo.
echo 【步骤5】检查控制台
echo   - 按 F12 打开开发者工具
echo   - 切换到 Console 标签
echo   - 检查是否还有以下错误：
echo     ✓ "模板不存在: undefined"
echo     ✓ "historyEl is not defined"
echo     ✓ "未知属性 'resize-direction'"
echo.
echo ========================================
echo 预期结果：
echo ========================================
echo ✓ 模板选择器正常工作
echo ✓ 用户消息显示在对话框右侧
echo ✓ 控制台无JavaScript错误
echo ✓ 可以选择不同的AI模型
echo ✓ 问一问功能正常工作
echo ✓ AI回答基于专利完整内容
echo.
echo ========================================
echo 如果测试通过，可以部署到阿里云：
echo ========================================
echo.
echo 运行部署脚本：
echo   .\阿里云拉取移动端更新.bat
echo.
echo 或手动部署：
echo   ssh root@ipx.asia
echo   cd /www/wwwroot/ipx.asia
echo   git pull origin main
echo   sudo systemctl restart patent-workbench
echo.
pause
