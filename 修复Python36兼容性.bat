@echo off
chcp 65001 >nul
echo ========================================
echo 功能八OCR修复 - Python 3.6兼容版本
echo ========================================
echo.
echo 问题: Python 3.6不支持新版onnxruntime
echo 解决: 安装兼容Python 3.6的旧版本
echo.

echo [1/3] 安装兼容版本的依赖...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install rapidocr-onnxruntime==1.3.0 onnxruntime==1.3.0 opencv-python==4.5.5.64'"
if errorlevel 1 (
    echo.
    echo ❌ 安装失败，尝试使用国内镜像...
    ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple rapidocr-onnxruntime==1.3.0 onnxruntime==1.3.0 opencv-python==4.5.5.64'"
)
echo.

echo [2/3] 验证安装...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 -c \"import onnxruntime; print(\\\"✅ onnxruntime:\\\", onnxruntime.__version__)\"'"
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 -c \"import cv2; print(\\\"✅ opencv:\\\", cv2.__version__)\"'"
echo.

echo [3/3] 重启应用...
ssh root@43.99.101.195 "systemctl restart patent-app"
echo ✅ 应用已重启
echo.

echo ========================================
echo 注意事项
echo ========================================
echo.
echo 由于Python 3.6版本较旧，使用了兼容版本的依赖
echo 如果OCR识别效果不佳，建议升级Python到3.8+
echo.
echo 下一步:
echo 1. 访问: http://43.99.101.195
echo 2. 测试功能八
echo 3. 如果仍有问题，考虑升级Python
echo.

pause
