@echo off
chcp 65001 >nul
echo ========================================
echo 验证OCR修复 - Python 3.11 + RapidOCR
echo ========================================
echo.

echo [1/3] 检查服务状态...
ssh root@43.99.101.195 "systemctl is-active patent-app"
if %errorlevel% neq 0 (
    echo ❌ 服务未运行
    pause
    exit /b 1
)
echo ✅ 服务正在运行
echo.

echo [2/3] 验证Python版本和RapidOCR...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && python --version && python -c \"from rapidocr_onnxruntime import RapidOCR; print(\\\"✅ RapidOCR导入成功\\\")\" && deactivate'"
echo.

echo [3/3] 检查应用进程...
ssh root@43.99.101.195 "ps aux | grep python3.11 | grep gunicorn | grep -v grep"
echo.

echo ========================================
echo ✅ 验证完成！
echo ========================================
echo.
echo 📋 测试步骤:
echo.
echo 1. 打开浏览器访问: http://43.99.101.195
echo.
echo 2. 登录后进入"功能八 - 专利附图标记识别"
echo.
echo 3. 上传测试图片（专利附图）
echo.
echo 4. 在"说明书内容"中输入标记定义，例如:
echo    1. 底座
echo    2. 旋转臂
echo    3. 夹紧装置
echo.
echo 5. 点击"开始识别"
echo.
echo 📊 预期结果:
echo    ✅ 识别出 ^> 0 个数字序号
echo    ✅ 匹配率 ^> 0%%
echo    ✅ Canvas上显示标注框
echo    ✅ 显示置信度分数
echo.
echo 🔍 如果仍然识别为0，查看后端日志:
echo    ssh root@43.99.101.195 "journalctl -u patent-app -f"
echo.

pause
