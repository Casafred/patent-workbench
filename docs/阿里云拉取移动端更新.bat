@echo off
chcp 65001 >nul
echo ========================================
echo 阿里云服务器 - 拉取移动端优化更新
echo ========================================
echo.
echo 服务器地址: 43.99.101.195
echo 更新内容: 移动端响应式支持
echo.
echo 即将执行以下操作:
echo 1. SSH连接到阿里云服务器
echo 2. 拉取最新代码 (git pull)
echo 3. 重启应用服务
echo.
echo 请准备好服务器root密码...
echo.
pause
echo.

echo [1/3] 连接服务器并拉取代码...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git pull origin main'"

if %errorlevel% equ 0 (
    echo ✓ 代码拉取成功
) else (
    echo ✗ 代码拉取失败
    echo.
    echo 可能的原因:
    echo - SSH连接失败
    echo - 密码错误
    echo - 网络问题
    echo.
    pause
    exit /b 1
)
echo.

echo [2/3] 重启应用服务...
ssh root@43.99.101.195 "systemctl restart patent-app"

if %errorlevel% equ 0 (
    echo ✓ 服务重启成功
) else (
    echo ✗ 服务重启失败
    pause
    exit /b 1
)
echo.

echo [3/3] 检查服务状态...
ssh root@43.99.101.195 "systemctl status patent-app --no-pager | head -n 10"
echo.

echo ========================================
echo 更新完成！
echo ========================================
echo.
echo 📱 移动端优化已部署到阿里云
echo.
echo 测试方法:
echo 1. 在手机浏览器访问: http://43.99.101.195
echo 2. 查看标签页是否竖向排列
echo 3. 测试表格横向滚动
echo 4. 测试各功能模块
echo.
echo 主要改进:
echo ✓ 标签页竖向排列（移动端）
echo ✓ 内容可横向滚动
echo ✓ 触摸优化（最小44px）
echo ✓ 支持横屏/竖屏切换
echo.
echo 如需查看日志:
echo ssh root@43.99.101.195 "tail -f /home/appuser/patent-app/logs/error.log"
echo.
echo 如需回滚:
echo ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git reset --hard HEAD~2' && systemctl restart patent-app"
echo.
pause
