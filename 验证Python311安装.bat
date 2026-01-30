@echo off
chcp 65001 >nul
echo ========================================
echo 验证Python 3.11虚拟环境
echo ========================================
echo.

echo [1/3] 检查虚拟环境是否存在...
ssh root@43.99.101.195 "su - appuser -c 'ls -la ~/patent-app/venv311/bin/python 2>/dev/null && echo ✅ 虚拟环境已创建 || echo ❌ 虚拟环境不存在'"
echo.

echo [2/3] 检查Python版本...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && python --version && deactivate'"
echo.

echo [3/3] 检查RapidOCR是否已安装...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && pip list | grep rapidocr && deactivate'"
echo.

echo ========================================
echo 检查完成
echo ========================================
echo.

pause
