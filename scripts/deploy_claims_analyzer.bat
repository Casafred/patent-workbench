@echo off
chcp 65001 >nul
echo ========================================
echo 权利要求分析器 - 部署脚本
echo ========================================
echo.

echo [1/5] 检查文件完整性...
if not exist "frontend\claims_analyzer.html" (
    echo ❌ 错误: frontend\claims_analyzer.html 不存在
    goto :error
)
if not exist "js\claimsAnalyzer.js" (
    echo ❌ 错误: js\claimsAnalyzer.js 不存在
    goto :error
)
if not exist "backend\routes\claims_analyzer.py" (
    echo ❌ 错误: backend\routes\claims_analyzer.py 不存在
    goto :error
)
echo ✅ 所有文件完整

echo.
echo [2/5] 检查依赖项...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: Python 未安装
    goto :error
)
echo ✅ Python 已安装

echo.
echo [3/5] 验证Flask应用...
python -c "from backend.routes.claims_analyzer import claims_analyzer_bp; print('✅ 蓝图导入成功')" 2>nul
if errorlevel 1 (
    echo ⚠️  警告: 蓝图导入失败，但不影响前端功能
) else (
    echo ✅ 后端API正常
)

echo.
echo [4/5] 生成访问链接...
echo.
echo 📍 访问方式：
echo    方式一（推荐）: http://localhost:5000/frontend/claims_analyzer.html
echo    方式二: 从主页面点击"权利要求分析器（独立页面）"按钮
echo    测试页面: http://localhost:5000/test_claims_analyzer.html
echo.

echo [5/5] 启动应用...
echo.
echo 正在启动Flask应用...
echo 按 Ctrl+C 停止服务器
echo.
python run_app.py

goto :end

:error
echo.
echo ❌ 部署失败！请检查错误信息。
pause
exit /b 1

:end
echo.
echo ✅ 部署完成！
pause
