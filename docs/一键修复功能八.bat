@echo off
chcp 65001 >nul
echo ========================================
echo 功能八OCR问题一键修复
echo ========================================
echo.

echo [1/9] 停止服务...
ssh root@43.99.101.195 "systemctl stop patent-app"
if errorlevel 1 (
    echo ❌ 停止服务失败
    pause
    exit /b 1
)
echo ✅ 服务已停止

echo.
echo [2/9] 清理进程...
ssh root@43.99.101.195 "pkill -9 -f 'gunicorn.*patent' 2>/dev/null || true"
echo ✅ 进程已清理

echo.
echo [3/9] 清除Python缓存...
ssh root@43.99.101.195 "find /home/appuser/patent-app -name '*.pyc' -delete 2>/dev/null || true"
ssh root@43.99.101.195 "find /home/appuser/patent-app -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true"
echo ✅ 缓存已清除

echo.
echo [4/9] 拉取最新代码...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git pull origin main'"
if errorlevel 1 (
    echo ⚠️ Git拉取失败，尝试强制更新...
    ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git fetch --all && git reset --hard origin/main'"
)
echo ✅ 代码已更新

echo.
echo [5/9] 检查Python环境...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && python --version'"
echo ✅ Python环境正常

echo.
echo [6/9] 安装/更新依赖...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && pip install --upgrade rapidocr-onnxruntime opencv-python Pillow numpy'"
echo ✅ 依赖已更新

echo.
echo [7/9] 启动服务...
ssh root@43.99.101.195 "systemctl start patent-app"
timeout /t 5 /nobreak >nul
echo ✅ 服务已启动

echo.
echo [8/9] 验证服务状态...
ssh root@43.99.101.195 "systemctl status patent-app --no-pager | head -20"

echo.
echo [9/9] 查看最新日志...
ssh root@43.99.101.195 "journalctl -u patent-app -n 30 --no-pager"

echo.
echo ========================================
echo ✅ 修复完成！
echo ========================================
echo.
echo 下一步：
echo 1. 访问 http://43.99.101.195
echo 2. 进入功能八
echo 3. 上传测试图片
echo 4. 检查识别结果
echo.
pause
