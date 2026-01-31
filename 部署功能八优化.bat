@echo off
chcp 65001 >nul
echo ========================================
echo 功能八 OCR标注优化 - 部署脚本
echo ========================================
echo.

echo [1/5] 检查修改的文件...
git status
echo.

echo [2/5] 添加文件到Git...
git add frontend/js/drawingMarkerInteractive.js
git add frontend/index.html
git add test_interactive_marker.html
git add 功能八OCR标注优化完成.md
git add 测试功能八优化.bat
git add 部署功能八优化.bat
echo ✓ 文件已添加
echo.

echo [3/5] 提交更改...
git commit -m "功能八OCR标注优化：高清显示+缩放+弹窗

- 图片使用原始尺寸，保持高清不模糊
- 支持鼠标滚轮和按钮缩放（50%-300%）
- 新增全屏弹窗查看功能
- 标注框字体保持清晰可读
- 优化坐标转换和事件处理
- 更新测试页面展示新功能"
echo ✓ 提交完成
echo.

echo [4/5] 推送到远程仓库...
git push
if errorlevel 1 (
    echo ✗ 推送失败，请检查网络连接
    pause
    exit /b 1
)
echo ✓ 推送成功
echo.

echo [5/5] 部署到服务器...
echo.
echo 请选择部署方式：
echo   1. 阿里云服务器
echo   2. Render平台
echo   3. 跳过部署
echo.
set /p choice="请输入选择 (1-3): "

if "%choice%"=="1" (
    echo.
    echo 部署到阿里云...
    echo 请在服务器上执行：
    echo   cd /path/to/project
    echo   git pull
    echo   sudo systemctl restart gunicorn
    echo.
) else if "%choice%"=="2" (
    echo.
    echo 部署到Render...
    echo Render会自动检测Git推送并部署
    echo 请访问 Render Dashboard 查看部署状态
    echo.
) else (
    echo.
    echo 跳过部署
    echo.
)

echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 后续步骤：
echo   1. 清除浏览器缓存（Ctrl+Shift+Delete）
echo   2. 访问网站测试新功能
echo   3. 验证所有功能正常工作
echo.
echo 测试清单：
echo   ✓ 图片是否高清
echo   ✓ 缩放功能是否正常
echo   ✓ 弹窗是否可以打开
echo   ✓ 标注框是否清晰
echo   ✓ 导出功能是否正常
echo.

pause
