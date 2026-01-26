@echo off
chcp 65001 >nul
echo ========================================
echo 功能五 v4.0 部署脚本
echo ========================================
echo.

echo [1/5] 检查Git状态...
git status
echo.

echo [2/5] 添加所有更改...
git add .
echo.

echo [3/5] 提交更改...
git commit -m "功能五v4.0部署：动态对比+耦合分析+导出报告"
echo.

echo [4/5] 推送到GitHub...
git push origin main
echo.

echo [5/5] 部署完成！
echo.
echo ========================================
echo 部署成功！
echo ========================================
echo.
echo 更新内容：
echo - 动态对比数量（2-10个）
echo - 耦合分析功能
echo - 导出Markdown报告
echo - 矩阵点击跳转
echo - 统计面板主题绿色
echo - 即时对话输入框优化
echo.
echo 下一步：
echo 1. 访问应用测试新功能
echo 2. 参考"功能五v4.0测试指南.md"进行测试
echo 3. 如有问题，查看"功能五v4.0全面升级完成.md"
echo.
pause
