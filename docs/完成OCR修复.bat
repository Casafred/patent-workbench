@echo off
chcp 65001 >nul
echo ========================================
echo 完成功能八OCR修复 - 最后一步
echo ========================================
echo.

echo [1/4] 备份当前服务配置...
ssh root@43.99.101.195 "cp /etc/systemd/system/patent-app.service /etc/systemd/system/patent-app.service.bak"
echo ✅ 备份完成
echo.

echo [2/4] 修改服务配置...
echo.
echo 需要手动修改两处:
echo 1. Environment="PATH=/home/appuser/patent-app/venv/bin"
echo    改为: Environment="PATH=/home/appuser/patent-app/venv311/bin"
echo.
echo 2. ExecStart=/home/appuser/patent-app/venv/bin/gunicorn
echo    改为: ExecStart=/home/appuser/patent-app/venv311/bin/gunicorn
echo.
echo 按任意键打开编辑器...
pause >nul

ssh root@43.99.101.195 "systemctl edit --full patent-app"

echo.
echo [3/4] 重新加载并重启服务...
ssh root@43.99.101.195 "systemctl daemon-reload"
ssh root@43.99.101.195 "systemctl restart patent-app"
echo ✅ 服务已重启
echo.

echo [4/4] 查看服务状态...
ssh root@43.99.101.195 "systemctl status patent-app"
echo.

echo ========================================
echo ✅ 修复完成！
echo ========================================
echo.
echo 下一步:
echo 1. 访问: http://43.99.101.195
echo 2. 进入功能八（专利附图标记识别）
echo 3. 上传图片测试
echo.
echo 预期结果:
echo - 识别出 ^> 0 个数字序号
echo - 匹配率 ^> 0%%
echo - Canvas显示标注
echo.

pause
