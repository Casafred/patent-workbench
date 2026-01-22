@echo off
echo ========================================
echo 部署大文件处理性能优化
echo ========================================
echo.

echo [1/4] 检查Git状态...
git status

echo.
echo [2/4] 添加修改的文件...
git add backend/routes/claims.py
git add backend/config.py
git add patent_claims_processor/services/processing_service.py
git add js/claimsProcessorIntegrated.js
git add Procfile
git add docs/fixes/大文件处理性能优化.md
git add scripts/deploy_performance_fix.bat

echo.
echo [3/4] 提交更改...
git commit -m "优化大文件处理性能：减少I/O、增加超时、改进轮询

- 列加载从100行优化到10行，速度提升90%%
- 恢复状态保存从每100行优化到每500行，减少80%%磁盘I/O
- 轮询最大错误次数从3次增加到10次
- 轮询间隔从2-5秒调整到3-8秒，减少40%%请求
- Gunicorn超时从300秒增加到600秒
- 添加线程支持（gthread worker）
- 改进错误处理，避免JSON解析错误
- 添加最大轮询时间限制（10分钟）

修复问题：
- 大文件上传后列加载很慢
- 处理卡在0%%后轮询失败
- JSON解析错误导致任务丢失
"

echo.
echo [4/4] 推送到GitHub...
git push origin main

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo Render会自动检测到更新并重新部署
echo 请在Render控制台查看部署进度
echo.
echo 测试建议：
echo 1. 上传小文件（^<100行）验证基本功能
echo 2. 上传中等文件（100-500行）验证性能提升
echo 3. 上传大文件（500-1000行）验证不再超时
echo.
pause
