@echo off
chcp 65001 >nul
echo ========================================
echo 功能八OCR立即修复
echo ========================================
echo.
echo 问题确认: RapidOCR未安装
echo 正在修复...
echo.

echo [1/3] 安装RapidOCR依赖...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install rapidocr-onnxruntime opencv-python Pillow numpy'"
if errorlevel 1 (
    echo.
    echo ❌ 安装失败，尝试使用国内镜像...
    ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple rapidocr-onnxruntime opencv-python Pillow numpy'"
)
echo.

echo [2/3] 验证安装...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 -c \"from rapidocr_onnxruntime import RapidOCR; import cv2; from PIL import Image; print(\\\"✅ 所有依赖已安装\\\")\"'"
echo.

echo [3/3] 重启应用...
ssh root@43.99.101.195 "systemctl restart patent-app"
echo ✅ 应用已重启
echo.

echo 等待5秒让应用启动...
timeout /t 5 /nobreak >nul
echo.

echo ========================================
echo ✅ 修复完成！
echo ========================================
echo.
echo 下一步:
echo 1. 访问: http://43.99.101.195
echo 2. 进入功能八（专利附图标记识别）
echo 3. 上传图片测试
echo.
echo 预期结果:
echo - 识别出 ^> 0 个数字序号
echo - 匹配率 ^> 0%%
echo - Canvas上显示标注
echo.

pause
