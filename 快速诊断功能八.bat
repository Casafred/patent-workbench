@echo off
chcp 65001 >nul
echo ========================================
echo 功能八OCR快速诊断
echo ========================================
echo.

echo [1/6] 检查服务状态...
ssh root@43.99.101.195 "systemctl status patent-app --no-pager | head -10"
echo.

echo [2/6] 检查Python版本...
ssh root@43.99.101.195 "ps aux | grep python | grep gunicorn | head -1"
echo.

echo [3/6] 检查RapidOCR...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && python -c \"from rapidocr_onnxruntime import RapidOCR; print(\\\"✅ RapidOCR OK\\\")\"'"
echo.

echo [4/6] 检查代码版本...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git log --oneline -1'"
echo.

echo [5/6] 检查最近日志...
ssh root@43.99.101.195 "journalctl -u patent-app -n 20 --no-pager | grep -E '(ERROR|OCR|detected)'"
echo.

echo [6/6] 检查内存使用...
ssh root@43.99.101.195 "free -h"
echo.

echo ========================================
echo 诊断完成
echo ========================================
echo.
echo 如果发现问题，运行: 一键修复功能八.bat
echo.
pause
