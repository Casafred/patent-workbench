@echo off
chcp 65001 >nul
echo ========================================
echo   功能八OCR依赖一键修复脚本
echo ========================================
echo.

echo 第一步：上传安装脚本到服务器
echo ----------------------------------------
scp scripts/install_ocr_deps_aliyun.sh root@43.99.101.195:/home/appuser/patent-app/
if %errorlevel% neq 0 (
    echo ❌ 上传失败，请检查网络连接
    pause
    exit /b 1
)
echo ✅ 上传成功
echo.

echo 第二步：在服务器上执行安装
echo ----------------------------------------
echo 正在连接服务器并安装依赖...
echo.
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && chmod +x scripts/install_ocr_deps_aliyun.sh && ./scripts/install_ocr_deps_aliyun.sh'"
if %errorlevel% neq 0 (
    echo ❌ 安装失败
    echo.
    echo 请尝试手动安装：
    echo   ssh root@43.99.101.195
    echo   su - appuser
    echo   cd ~/patent-app
    echo   pip3 install pytesseract opencv-python Pillow
    pause
    exit /b 1
)
echo.

echo ========================================
echo   ✅ 安装完成！
echo ========================================
echo.
echo 下一步：
echo 1. 重启应用服务
echo 2. 打开网站测试功能八：http://43.99.101.195
echo 3. 上传专利附图和说明书
echo 4. 查看识别结果（应该不再是0个）
echo.
echo 查看日志：
echo   ssh root@43.99.101.195 "su - appuser -c 'tail -f ~/patent-app/logs/error.log'"
echo.
pause
