@echo off
chcp 65001 >nul
echo ========================================
echo 切换到PaddleOCR（Python 3.6兼容）
echo ========================================
echo.
echo 原因: RapidOCR需要cmake和Python 3.8+
echo 解决: 使用PaddleOCR（更简单，更兼容）
echo.

echo [1/5] 上传更新的代码...
scp requirements.txt backend/utils/ocr_utils.py root@43.99.101.195:/home/appuser/patent-app/
if errorlevel 1 (
    echo ❌ 上传失败
    pause
    exit /b 1
)
echo ✅ 代码已上传
echo.

echo [2/5] 卸载RapidOCR...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 uninstall -y rapidocr-onnxruntime onnxruntime onnx'"
echo.

echo [3/5] 安装PaddleOCR...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple paddleocr==2.6.0 opencv-python==4.5.5.64'"
if errorlevel 1 (
    echo ❌ 安装失败
    pause
    exit /b 1
)
echo ✅ PaddleOCR已安装
echo.

echo [4/5] 验证安装...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 -c \"from paddleocr import PaddleOCR; import cv2; from PIL import Image; print(\\\"✅ 所有依赖已安装\\\")\"'"
echo.

echo [5/5] 重启应用...
ssh root@43.99.101.195 "systemctl restart patent-app"
echo ✅ 应用已重启
echo.

echo ========================================
echo ✅ 切换完成！
echo ========================================
echo.
echo PaddleOCR优势:
echo - ✅ 支持Python 3.6
echo - ✅ 不需要cmake
echo - ✅ 中文识别更好
echo - ✅ 安装更简单
echo.
echo 下一步:
echo 1. 访问: http://43.99.101.195
echo 2. 测试功能八
echo 3. 查看识别效果
echo.

pause
