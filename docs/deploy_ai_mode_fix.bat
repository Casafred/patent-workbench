@echo off
chcp 65001 >nul
echo ============================================================
echo AI说明书处理开关修复 - 部署脚本
echo ============================================================
echo.

echo [1/4] 检查修改的文件...
if exist "backend\routes\drawing_marker.py" (
    echo   ✓ backend\routes\drawing_marker.py 已修改
) else (
    echo   ✗ 文件不存在！
    pause
    exit /b 1
)

echo.
echo [2/4] 验证Python语法...
python -m py_compile backend\routes\drawing_marker.py
if %errorlevel% neq 0 (
    echo   ✗ Python语法错误！
    pause
    exit /b 1
)
echo   ✓ 语法检查通过

echo.
echo [3/4] 显示修复说明...
echo.
echo   修复内容:
echo   - 在 process_drawing_marker 函数中添加 ai_mode 判断
echo   - AI模式开启时使用 AIDescriptionProcessor
echo   - AI模式关闭时使用 extract_reference_markers (jieba)
echo   - 更新返回结果中的 extraction_method 标识
echo.
echo   影响范围:
echo   - 功能八（交互式附图标注）
echo   - AI说明书处理功能
echo.

echo [4/4] 准备部署...
echo.
echo   本地测试步骤:
echo   1. 重启后端服务
echo   2. 打开功能八页面
echo   3. 关闭AI开关，测试jieba模式
echo   4. 打开AI开关，选择模型，测试AI模式
echo   5. 查看后端日志确认处理方式
echo.
echo   服务器部署步骤:
echo   1. 提交代码到Git
echo   2. 推送到GitHub
echo   3. 在服务器上拉取最新代码
echo   4. 重启服务
echo.

echo ============================================================
echo 修复完成！可以开始测试
echo ============================================================
echo.

pause
