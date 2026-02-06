@echo off
chcp 65001 >nul
echo ========================================
echo 检查服务器Python版本
echo ========================================
echo.

echo 检查所有Python版本...
ssh root@43.99.101.195 "ls -la /usr/bin/python* 2>/dev/null | grep python3"
echo.

echo 检查Python 3.8...
ssh root@43.99.101.195 "python3.8 --version 2>/dev/null || echo '❌ Python 3.8 未安装'"
echo.

echo 检查Python 3.9...
ssh root@43.99.101.195 "python3.9 --version 2>/dev/null || echo '❌ Python 3.9 未安装'"
echo.

echo 检查Python 3.10...
ssh root@43.99.101.195 "python3.10 --version 2>/dev/null || echo '❌ Python 3.10 未安装'"
echo.

echo 当前默认Python版本:
ssh root@43.99.101.195 "python3 --version"
echo.

echo ========================================
echo 建议:
echo ========================================
echo.
echo 如果有Python 3.8+: 使用它（最佳）
echo 如果只有Python 3.6: 
echo   - 方案A: 切换到PaddleOCR（最快，5分钟）
echo   - 方案B: 升级Python到3.8（最好，10分钟）
echo   - 方案C: 安装cmake（麻烦，不推荐）
echo.

pause
