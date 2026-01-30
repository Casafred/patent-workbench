@echo off
chcp 65001 >nul
echo ========================================
echo 部署OCR超时修复
echo ========================================
echo.

echo [1/4] 上传修复后的文件...
scp backend/utils/ocr_utils.py root@43.99.101.195:/home/appuser/patent-app/backend/utils/
if %errorlevel% neq 0 (
    echo ❌ 上传失败
    pause
    exit /b 1
)
echo ✅ 文件已上传
echo.

echo [2/4] 修改文件权限...
ssh root@43.99.101.195 "chown appuser:appuser /home/appuser/patent-app/backend/utils/ocr_utils.py"
echo ✅ 权限已设置
echo.

echo [3/4] 重启服务...
ssh root@43.99.101.195 "systemctl restart patent-app"
if %errorlevel% neq 0 (
    echo ❌ 重启失败
    pause
    exit /b 1
)
echo ✅ 服务已重启
echo.

echo 等待服务启动 (5秒)...
timeout /t 5 /nobreak >nul
echo.

echo [4/4] 查看服务状态...
ssh root@43.99.101.195 "systemctl status patent-app --no-pager -l"
echo.

echo ========================================
echo ✅ 部署完成！
echo ========================================
echo.
echo 修复内容:
echo 1. 将超时时间从 10秒 增加到 60秒
echo 2. 简化 RapidOCR 初始化配置
echo 3. 添加详细的日志输出
echo 4. 修复 RapidOCR 结果解析
echo.
echo 下一步测试:
echo 1. 访问: http://43.99.101.195
echo 2. 进入功能八（专利附图标记识别）
echo 3. 上传图片测试
echo.
echo 如需查看实时日志:
echo ssh root@43.99.101.195 "journalctl -u patent-app -f"
echo.

pause
