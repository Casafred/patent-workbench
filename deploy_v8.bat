@echo off
chcp 65001 >nul
echo ========================================
echo   功能八 v8.0 部署脚本
echo ========================================
echo.

echo [1/4] 检查文件...
if not exist "frontend\js\multiImageViewer_v8.js" (
    echo ❌ 错误：找不到 multiImageViewer_v8.js
    pause
    exit /b 1
)
if not exist "frontend\js\drawingMarkerInteractive_v8.js" (
    echo ❌ 错误：找不到 drawingMarkerInteractive_v8.js
    pause
    exit /b 1
)
echo ✅ 核心文件检查完成

echo.
echo [2/4] 检查测试文件...
if not exist "test_multi_image_viewer_v8.html" (
    echo ⚠️  警告：找不到测试文件
) else (
    echo ✅ 测试文件存在
)

echo.
echo [3/4] 生成部署清单...
echo 核心文件： > deploy_v8_manifest.txt
echo - frontend/js/multiImageViewer_v8.js >> deploy_v8_manifest.txt
echo - frontend/js/drawingMarkerInteractive_v8.js >> deploy_v8_manifest.txt
echo. >> deploy_v8_manifest.txt
echo 测试文件： >> deploy_v8_manifest.txt
echo - test_multi_image_viewer_v8.html >> deploy_v8_manifest.txt
echo - test_interactive_marker_v8.html >> deploy_v8_manifest.txt
echo. >> deploy_v8_manifest.txt
echo 文档文件： >> deploy_v8_manifest.txt
echo - 功能八v8.0_完整功能版.md >> deploy_v8_manifest.txt
echo - 功能八v8.0_快速部署.md >> deploy_v8_manifest.txt
echo - 功能八v8.0_改进对比.md >> deploy_v8_manifest.txt
echo ✅ 部署清单已生成：deploy_v8_manifest.txt

echo.
echo [4/4] 部署选项
echo.
echo 请选择部署方式：
echo 1. 本地测试（打开测试页面）
echo 2. 复制到生产环境
echo 3. 查看部署清单
echo 4. 退出
echo.
set /p choice="请输入选项 (1-4): "

if "%choice%"=="1" goto local_test
if "%choice%"=="2" goto production
if "%choice%"=="3" goto manifest
if "%choice%"=="4" goto end

:local_test
echo.
echo 正在打开测试页面...
start test_multi_image_viewer_v8.html
echo ✅ 测试页面已打开
echo.
echo 测试清单：
echo - 点击"打开多图查看器"按钮
echo - 鼠标移到边缘查看箭头
echo - 点击箭头切换图片
echo - 使用键盘方向键导航
echo - 滚轮缩放图片
echo - 点击标注列表高亮
echo - 双击图片添加标注
echo - 点击调试面板按钮
echo - 测试旋转功能
goto end

:production
echo.
set /p target="请输入目标目录路径: "
if not exist "%target%" (
    echo ❌ 错误：目标目录不存在
    goto end
)

echo 正在复制文件...
xcopy /Y "frontend\js\multiImageViewer_v8.js" "%target%\js\" >nul
xcopy /Y "frontend\js\drawingMarkerInteractive_v8.js" "%target%\js\" >nul
echo ✅ 文件复制完成

echo.
echo 部署完成！
echo.
echo 使用方法：
echo 1. 在HTML中引入：
echo    ^<script src="js/multiImageViewer_v8.js"^>^</script^>
echo.
echo 2. 创建查看器：
echo    const viewer = new MultiImageViewerV8(images);
echo    viewer.open(0);
goto end

:manifest
echo.
type deploy_v8_manifest.txt
echo.
goto end

:end
echo.
echo ========================================
echo   部署完成
echo ========================================
pause
