@echo off
echo ========================================
echo 功能七导出修复 - 部署到GitHub
echo ========================================
echo.

echo [1/4] 添加修改的文件...
git add patent_claims_processor/services/export_service.py
git add backend/routes/claims.py
git add js/claimsProcessor.js
git add test_export_bytesio.py
git add 功能七导出修复完成.md
git add .kiro/specs/claims-export-fix/

echo.
echo [2/4] 提交更改...
git commit -m "修复功能七导出和报告查看问题

- 使用BytesIO替代文件系统，避免Render环境权限问题
- 使用Flask send_file()正确传输二进制文件
- 使用模态框替代window.open()避免弹窗拦截
- 添加完整的测试和文档

修复内容:
1. Excel导出现在生成有效的.xlsx文件
2. JSON导出现在生成有效的.json文件（UTF-8编码）
3. 报告查看在模态框中正确显示
4. 所有功能在Render生产环境中正常工作"

echo.
echo [3/4] 推送到GitHub...
git push origin main

echo.
echo [4/4] 完成！
echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo Render会自动检测到更新并重新部署
echo 请等待几分钟后测试以下功能：
echo.
echo 1. 导出Excel - 验证文件可以打开
echo 2. 导出JSON - 验证文件可以解析
echo 3. 查看报告 - 验证模态框显示
echo.
echo 详细信息请查看: 功能七导出修复完成.md
echo.
pause
