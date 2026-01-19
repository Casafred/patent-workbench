@echo off
chcp 65001 >nul
echo ========================================
echo 功能六批量专利解读优化 - 部署脚本
echo ========================================
echo.

echo [1/4] 检查修改的文件...
if not exist "backend\routes\patent.py" (
    echo ❌ 错误: backend\routes\patent.py 不存在
    pause
    exit /b 1
)
if not exist "js\main.js" (
    echo ❌ 错误: js\main.js 不存在
    pause
    exit /b 1
)
if not exist "frontend\index.html" (
    echo ❌ 错误: frontend\index.html 不存在
    pause
    exit /b 1
)
echo ✅ 所有文件存在

echo.
echo [2/4] 验证Python语法...
python -m py_compile backend\routes\patent.py
if errorlevel 1 (
    echo ❌ Python语法错误
    pause
    exit /b 1
)
echo ✅ Python语法正确

echo.
echo [3/4] 添加到Git...
git add backend\routes\patent.py
git add js\main.js
git add frontend\index.html
git add docs\fixes\功能六批量专利解读优化完成.md
git add docs\fixes\功能六测试指南.md
git add scripts\deploy_feature6_fix.bat
echo ✅ 文件已添加到Git

echo.
echo [4/4] 提交更改...
git commit -m "修复功能六：批量专利解读优化

1. 说明书选项现在会真正影响解读结果
2. 解读结果以表格形式显示，不再显示JSON字符串
3. Excel导出将字段正确拆分到各列
4. 优化界面提示信息"

if errorlevel 1 (
    echo ⚠️ 提交失败或没有更改
) else (
    echo ✅ 提交成功
)

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 下一步操作：
echo 1. 运行 'git push' 推送到远程仓库
echo 2. 如果使用Render等平台，会自动部署
echo 3. 部署完成后，参考 docs\fixes\功能六测试指南.md 进行测试
echo.
pause
