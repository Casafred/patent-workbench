@echo off
chcp 65001 >nul
echo ========================================
echo 修复阿里云服务器 RapidOCR 依赖
echo ========================================
echo.

echo [1/4] 连接服务器并安装 RapidOCR...
ssh root@43.99.101.195 "cd /root/patent_system && source venv/bin/activate && pip install rapidocr-onnxruntime>=1.3.0"

echo.
echo [2/4] 验证安装...
ssh root@43.99.101.195 "cd /root/patent_system && source venv/bin/activate && python -c 'from rapidocr_onnxruntime import RapidOCR; print(\"RapidOCR 安装成功!\")'"

echo.
echo [3/4] 重启服务...
ssh root@43.99.101.195 "systemctl restart patent_system"

echo.
echo [4/4] 检查服务状态...
timeout /t 3 >nul
ssh root@43.99.101.195 "systemctl status patent_system --no-pager | head -20"

echo.
echo ========================================
echo 修复完成！
echo ========================================
echo.
echo 测试命令：
echo curl http://43.99.101.195:5001/api/health
echo.
pause
