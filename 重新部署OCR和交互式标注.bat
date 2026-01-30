@echo off
chcp 65001 >nul
echo ======================================
echo 重新部署OCR修复和交互式标注功能
echo ======================================
echo.
echo 这个脚本会部署：
echo 1. OCR的elapse格式化修复
echo 2. OCR的置信度转换修复  
echo 3. 交互式标注功能
echo.
pause

echo.
echo [步骤1] 上传OCR修复文件...
scp backend/utils/ocr_utils.py root@43.99.101.195:/home/appuser/patent-app/backend/utils/

echo.
echo [步骤2] 上传交互式标注JS文件...
scp js/drawingMarkerInteractive.js root@43.99.101.195:/home/appuser/patent-app/js/

echo.
echo [步骤3] 上传更新后的index.html...
scp frontend/index.html root@43.99.101.195:/home/appuser/patent-app/frontend/

echo.
echo [步骤4] 修复文件权限并重启服务...
ssh root@43.99.101.195 "chown -R appuser:appuser /home/appuser/patent-app && systemctl stop patent-app && pkill -9 -f 'gunicorn.*patent' && find /home/appuser/patent-app -type f -name '*.pyc' -delete && find /home/appuser/patent-app -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null ; systemctl start patent-app"

echo.
echo [步骤5] 等待服务启动...
timeout /t 3 /nobreak >nul

echo.
echo [步骤6] 查看服务状态...
ssh root@43.99.101.195 "systemctl status patent-app --no-pager"

echo.
echo ======================================
echo ✅ 部署完成！
echo ======================================
echo.
echo 修复内容：
echo 1. ✅ OCR elapse格式化 - 支持None/float/list
echo 2. ✅ OCR置信度转换 - 先转float再乘100
echo 3. ✅ 交互式标注 - 可拖动、可编辑、连线指向
echo.
echo 测试步骤：
echo 1. 访问: http://43.99.101.195
echo 2. 进入功能八（专利附图标记识别）
echo 3. 上传专利附图测试OCR识别
echo 4. 测试拖动标注框
echo 5. 双击标注框编辑文字
echo 6. 点击"导出图片"保存结果
echo.
echo 查看实时日志:
echo ssh root@43.99.101.195 "journalctl -u patent-app -f"
echo.
pause
