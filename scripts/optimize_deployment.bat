@echo off
chcp 65001 >nul
echo ========================================
echo Render 部署性能优化脚本
echo ========================================
echo.

echo [1/5] 备份当前 requirements.txt...
copy requirements.txt requirements.txt.backup >nul
echo ✓ 备份完成

echo.
echo [2/5] 应用优化后的依赖...
copy requirements-optimized.txt requirements.txt >nul
echo ✓ 依赖文件已更新

echo.
echo [3/5] 检查本地环境...
python -c "from backend.app import create_app; app = create_app(); print('✓ 应用创建成功')" 2>nul
if errorlevel 1 (
    echo ✗ 应用测试失败，正在回滚...
    copy requirements.txt.backup requirements.txt >nul
    echo ✗ 已回滚到原始配置
    pause
    exit /b 1
)

echo.
echo [4/5] 准备提交...
echo.
echo 优化内容：
echo   - 移除测试依赖（pytest, hypothesis）
echo   - 移除未使用的库（google-patent-scraper, xlrd, httpx, pydantic, sniffio）
echo   - 预计构建时间减少 40%%
echo.

set /p confirm="是否继续提交到 Git? (y/n): "
if /i not "%confirm%"=="y" (
    echo 已取消
    pause
    exit /b 0
)

echo.
echo [5/5] 提交到 Git...
git add requirements.txt requirements-optimized.txt requirements-dev.txt
git commit -m "优化部署性能：移除测试依赖和未使用的库

- 移除 pytest, hypothesis（测试库）
- 移除 google-patent-scraper, xlrd（未使用）
- 移除 httpx, pydantic, sniffio（未使用）
- 预计构建时间减少 40%%
- 创建 requirements-dev.txt 用于开发环境"

echo.
echo ✓ 提交完成！
echo.
echo 下一步：
echo   1. 运行: git push
echo   2. Render 将自动重新部署
echo   3. 观察构建日志，验证性能提升
echo.
echo 如需回滚：
echo   copy requirements.txt.backup requirements.txt
echo   git add requirements.txt
echo   git commit -m "回滚依赖配置"
echo   git push
echo.
pause
