@echo off
chcp 65001 >nul
echo ========================================
echo 部署交互式标注功能
echo ========================================
echo.

echo 步骤1: 上传交互式标注JS文件...
scp js/drawingMarkerInteractive.js root@43.99.101.195:/home/appuser/patent-app/js/
if errorlevel 1 (
    echo ❌ JS文件上传失败
    pause
    exit /b 1
)
echo ✅ JS文件上传成功
echo.

echo 步骤2: 上传更新后的index.html...
scp frontend/index.html root@43.99.101.195:/home/appuser/patent-app/frontend/
if errorlevel 1 (
    echo ❌ HTML文件上传失败
    pause
    exit /b 1
)
echo ✅ HTML文件上传成功
echo.

echo 步骤3: 设置文件权限...
ssh root@43.99.101.195 "chown -R appuser:appuser /home/appuser/patent-app/js/ /home/appuser/patent-app/frontend/"
echo ✅ 权限设置完成
echo.

echo ========================================
echo ✅ 部署完成！
echo ========================================
echo.
echo 新增功能:
echo 1. 标注偏移显示 - 不遮挡原始标记
echo 2. 可拖动标注 - 鼠标拖动调整位置
echo 3. 连线指向 - 虚线连接标注和原始位置
echo 4. 可编辑标注 - 双击编辑部件名称
echo 5. 视觉反馈 - 绿色/蓝色/橙色状态显示
echo 6. 导出功能 - 导出标注后的图片
echo.
echo 使用说明:
echo - 拖动标注框: 调整位置
echo - 双击标注框: 编辑名称
echo - 点击导出按钮: 保存图片
echo.
echo 测试步骤:
echo 1. 访问: http://43.99.101.195
echo 2. 进入功能八（专利附图标记识别）
echo 3. 上传图片和说明书
echo 4. 点击"开始处理"
echo 5. 尝试拖动和编辑标注
echo.
echo 如需清除浏览器缓存，请按 Ctrl+F5 强制刷新
echo.
pause
