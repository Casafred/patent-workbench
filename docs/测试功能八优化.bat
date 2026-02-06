@echo off
chcp 65001 >nul
echo ========================================
echo 功能八 OCR标注优化 - 快速测试
echo ========================================
echo.

echo [1/3] 打开测试页面...
start test_interactive_marker.html
timeout /t 2 >nul

echo.
echo [2/3] 测试项目：
echo   ✓ 图片是否高清（不模糊）
echo   ✓ 鼠标滚轮缩放是否工作
echo   ✓ +/- 按钮缩放是否工作
echo   ✓ 缩放比例显示是否正确
echo   ✓ 弹窗查看是否正常
echo   ✓ 标注框字体是否清晰
echo   ✓ 拖动标注是否流畅
echo   ✓ 双击编辑是否正常
echo   ✓ 导出图片是否成功
echo.

echo [3/3] 主界面测试：
echo   1. 打开 http://localhost:5000
echo   2. 进入功能八
echo   3. 上传测试图片
echo   4. 测试所有新功能
echo.

echo ========================================
echo 测试完成后，请确认：
echo   1. 图片清晰度是否提升
echo   2. 缩放功能是否流畅
echo   3. 弹窗是否正常工作
echo   4. 标注框字体是否清晰
echo ========================================
echo.

pause
