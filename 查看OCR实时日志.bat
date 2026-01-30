@echo off
chcp 65001 >nul
echo ========================================
echo 查看OCR实时日志
echo ========================================
echo.
echo 请在另一个窗口测试功能八，这里会显示实时日志
echo.
echo 按 Ctrl+C 停止查看
echo.
echo ========================================
echo.

ssh root@43.99.101.195 "journalctl -u patent-app -f --no-pager"
