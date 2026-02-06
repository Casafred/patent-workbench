@echo off
chcp 65001 >nul
echo ========================================
echo 功能八OCR一键诊断和修复
echo ========================================
echo.

echo [1/4] 上传诊断脚本到服务器...
scp quick_ocr_test.py fix_ocr_aliyun.sh diagnose_ocr_complete.py root@43.99.101.195:/home/appuser/patent-app/
if errorlevel 1 (
    echo ❌ 上传失败，请检查网络连接
    pause
    exit /b 1
)
echo ✅ 上传成功
echo.

echo [2/4] 运行快速测试（30秒）...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 quick_ocr_test.py'"
echo.

echo [3/4] 是否需要运行完整诊断？
echo 如果上面的快速测试失败，建议运行完整诊断
set /p choice="输入 y 运行完整诊断，或按回车跳过: "
if /i "%choice%"=="y" (
    echo 运行完整诊断...
    ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 diagnose_ocr_complete.py'"
    echo.
)

echo [4/4] 是否需要运行一键修复？
echo 如果测试显示依赖缺失，建议运行修复脚本
set /p choice="输入 y 运行修复脚本，或按回车跳过: "
if /i "%choice%"=="y" (
    echo 运行修复脚本...
    ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && chmod +x fix_ocr_aliyun.sh && ./fix_ocr_aliyun.sh'"
    echo.
    
    echo 重启应用...
    ssh root@43.99.101.195 "systemctl restart patent-app"
    echo ✅ 应用已重启
    echo.
    
    echo 等待5秒让应用启动...
    timeout /t 5 /nobreak >nul
    echo.
)

echo ========================================
echo 诊断完成！
echo ========================================
echo.
echo 下一步操作:
echo 1. 访问网站: http://43.99.101.195
echo 2. 进入功能八（专利附图标记识别）
echo 3. 上传测试图片并查看识别结果
echo.
echo 查看日志:
echo ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -f logs/error.log'"
echo.

pause
