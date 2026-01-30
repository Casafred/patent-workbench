@echo off
chcp 65001 >nul
echo ========================================
echo 自动修改服务配置使用Python 3.11
echo ========================================
echo.

echo [1/4] 备份当前配置...
ssh root@43.99.101.195 "cp /etc/systemd/system/patent-app.service /etc/systemd/system/patent-app.service.bak"
if %errorlevel% neq 0 (
    echo ❌ 备份失败
    pause
    exit /b 1
)
echo ✅ 备份完成
echo.

echo [2/4] 自动修改配置文件...
echo    - 修改 Environment PATH...
ssh root@43.99.101.195 "sed -i 's|Environment=\"PATH=/home/appuser/patent-app/venv/bin\"|Environment=\"PATH=/home/appuser/patent-app/venv311/bin\"|g' /etc/systemd/system/patent-app.service"
echo    - 修改 ExecStart...
ssh root@43.99.101.195 "sed -i 's|ExecStart=/home/appuser/patent-app/venv/bin/|ExecStart=/home/appuser/patent-app/venv311/bin/|g' /etc/systemd/system/patent-app.service"
if %errorlevel% neq 0 (
    echo ❌ 修改失败
    pause
    exit /b 1
)
echo ✅ 配置已修改
echo.

echo [3/4] 验证修改...
ssh root@43.99.101.195 "grep venv311 /etc/systemd/system/patent-app.service"
echo.

echo [4/4] 重新加载并重启服务...
ssh root@43.99.101.195 "systemctl daemon-reload && systemctl restart patent-app"
if %errorlevel% neq 0 (
    echo ❌ 重启失败
    echo.
    echo 查看错误日志:
    ssh root@43.99.101.195 "journalctl -u patent-app -n 50 --no-pager"
    pause
    exit /b 1
)
echo ✅ 服务已重启
echo.

echo 等待服务启动 (5秒)...
timeout /t 5 /nobreak >nul
echo.

echo ========================================
echo 查看服务状态
echo ========================================
ssh root@43.99.101.195 "systemctl status patent-app --no-pager -l"
echo.

echo ========================================
echo 验证Python版本
echo ========================================
ssh root@43.99.101.195 "ps aux | grep -E 'gunicorn|python' | grep patent | head -5"
echo.

echo ========================================
echo ✅ 修复完成！
echo ========================================
echo.
echo 下一步测试:
echo 1. 访问: http://43.99.101.195
echo 2. 进入功能八（专利附图标记识别）
echo 3. 上传图片测试
echo.
echo 预期结果:
echo - 识别出 ^> 0 个数字序号
echo - 匹配率 ^> 0%%
echo - Canvas显示标注
echo.
echo 如果服务未正常运行，查看日志:
echo ssh root@43.99.101.195 "journalctl -u patent-app -f"
echo.

pause
