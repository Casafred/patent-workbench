@echo off
chcp 65001 >nul
echo ==========================================
echo   修复阿里云服务器启动问题
echo ==========================================
echo.

set SERVER_IP=43.99.101.195
set SERVER_USER=root

echo 正在诊断并修复服务启动问题...
echo.

ssh %SERVER_USER%@%SERVER_IP% "
echo '=========================================='
echo '步骤 1: 检查虚拟环境'
echo '=========================================='
su - appuser -c '
    cd ~/patent-app
    if [ ! -f venv/bin/gunicorn ]; then
        echo \"虚拟环境中缺少gunicorn，正在安装...\"
        source venv/bin/activate
        pip install gunicorn
    else
        echo \"✓ gunicorn 已安装\"
    fi
'
echo ''

echo '=========================================='
echo '步骤 2: 检查依赖'
echo '=========================================='
su - appuser -c '
    cd ~/patent-app
    source venv/bin/activate
    echo \"安装/更新依赖...\"
    pip install -r requirements.txt
'
echo ''

echo '=========================================='
echo '步骤 3: 测试应用启动'
echo '=========================================='
su - appuser -c '
    cd ~/patent-app
    source venv/bin/activate
    timeout 5 python -c \"from backend.app import app; print(\\\"✓ 应用导入成功\\\")\" || echo \"✗ 应用导入失败\"
'
echo ''

echo '=========================================='
echo '步骤 4: 重新加载systemd并启动'
echo '=========================================='
systemctl daemon-reload
systemctl start patent-app
sleep 3
systemctl status patent-app --no-pager | head -20
echo ''

echo '=========================================='
echo '步骤 5: 查看应用日志'
echo '=========================================='
tail -30 /home/appuser/patent-app/logs/error.log 2>/dev/null || echo '日志文件不存在'
"

echo.
echo 修复完成！
echo.
echo 如果仍有问题，请查看详细日志：
echo   ssh root@%SERVER_IP% \"journalctl -u patent-app -n 100\"
echo.
pause
