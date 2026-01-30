@echo off
chcp 65001 >nul
echo ========================================
echo 部署OCR格式化错误修复
echo ========================================
echo.

echo 步骤1: 上传修复后的文件...
scp backend/utils/ocr_utils.py root@43.99.101.195:/home/appuser/patent-app/backend/utils/ocr_utils.py
if errorlevel 1 (
    echo ❌ 文件上传失败
    pause
    exit /b 1
)
echo ✅ 文件上传成功
echo.

echo 步骤2: 完全停止服务...
ssh root@43.99.101.195 "systemctl stop patent-app"
if errorlevel 1 (
    echo ❌ 停止服务失败
    pause
    exit /b 1
)
echo ✅ 服务已停止
echo.

echo 步骤3: 强制终止所有Gunicorn进程...
ssh root@43.99.101.195 "pkill -9 -f 'gunicorn.*patent' || true"
echo ✅ 进程已清理
echo.

echo 步骤4: 清除Python缓存...
ssh root@43.99.101.195 "find /home/appuser/patent-app -name '*.pyc' -delete 2>/dev/null || true"
ssh root@43.99.101.195 "find /home/appuser/patent-app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true"
echo ✅ 缓存已清除
echo.

echo 步骤5: 等待5秒确保进程完全终止...
timeout /t 5 /nobreak >nul
echo ✅ 等待完成
echo.

echo 步骤6: 启动服务...
ssh root@43.99.101.195 "systemctl start patent-app"
if errorlevel 1 (
    echo ❌ 启动服务失败
    pause
    exit /b 1
)
echo ✅ 服务已启动
echo.

echo 步骤7: 等待服务完全启动...
timeout /t 5 /nobreak >nul
echo.

echo 步骤8: 检查服务状态...
ssh root@43.99.101.195 "systemctl status patent-app --no-pager | head -20"
echo.

echo ========================================
echo ✅ 部署完成！
echo ========================================
echo.
echo 修复内容:
echo 1. 修复了elapse格式化错误（elapse可能是None、float或list）
echo 2. 修复了置信度分数转换错误（score是字符串需要先转float再乘100）
echo 3. 本地测试通过：test patent pic.png识别出9个标记，gif图识别出19个标记
echo.
echo 下一步测试:
echo 1. 访问: http://43.99.101.195
echo 2. 进入功能八（专利附图标记识别）
echo 3. 上传图片测试
echo.
echo 如需查看实时日志:
echo ssh root@43.99.101.195 "journalctl -u patent-app -f"
echo.
pause
