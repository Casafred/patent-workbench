@echo off
chcp 65001 >nul
echo ========================================
echo 移动端响应式优化部署脚本
echo ========================================
echo.

echo [1/4] 检查Git状态...
git status
echo.

echo [2/4] 添加修改的文件...
git add frontend/css/base/responsive.css
git add frontend/css/main.css
git add frontend/index.html
git add frontend/claims_analyzer.html
git add mobile_test.html
git add 移动端响应式优化完成.md
git add scripts/deploy_mobile_optimization.bat
echo ✓ 文件已添加
echo.

echo [3/4] 提交更改...
git commit -m "feat: 添加移动端响应式支持

主要更新:
- 新增 responsive.css 移动端样式文件
- 标签页从横向改为竖向排列（移动端）
- 支持内容横向滚动查看
- 优化触摸设备交互体验
- 添加多个响应式断点（768px, 480px）
- 更新viewport设置，支持移动端Web应用
- 创建移动端测试页面

适配设备:
- 手机（iPhone/Android）
- 平板（iPad/Android平板）
- 保持桌面端原有布局

版本: v20.1-mobile"
echo ✓ 更改已提交
echo.

echo [4/4] 推送到远程仓库...
git push origin main
if %errorlevel% equ 0 (
    echo ✓ 推送成功！
) else (
    echo ✗ 推送失败，请检查网络连接或权限
    pause
    exit /b 1
)
echo.

echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 📱 移动端优化已部署
echo.
echo 测试方法:
echo 1. 在手机浏览器打开: mobile_test.html
echo 2. 或直接访问主应用: frontend/index.html
echo 3. 使用Chrome DevTools设备模拟器测试
echo.
echo 主要改进:
echo ✓ 标签页竖向排列（移动端）
echo ✓ 内容可横向滚动
echo ✓ 触摸优化（最小44px触摸目标）
echo ✓ 支持横屏/竖屏切换
echo.
echo 详细说明请查看: 移动端响应式优化完成.md
echo.
pause
