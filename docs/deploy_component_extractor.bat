@echo off
chcp 65001 >nul
echo ==========================================
echo 部署功能八部件提取算法更新
echo ==========================================
echo.

echo 步骤1: 推送代码到GitHub...
git add .
git commit -m "功能八：添加基于jieba分词的智能部件提取算法"
git push origin main
if %errorlevel% neq 0 (
    echo ✗ 推送失败
    pause
    exit /b 1
)
echo ✓ 代码推送成功
echo.

echo 步骤2: 上传部署脚本到服务器...
scp deploy_component_extractor.sh root@43.99.101.195:/tmp/
if %errorlevel% neq 0 (
    echo ✗ 上传失败
    pause
    exit /b 1
)
echo ✓ 脚本上传成功
echo.

echo 步骤3: 在服务器上执行部署...
ssh root@43.99.101.195 "su - appuser -c 'bash /tmp/deploy_component_extractor.sh'"
if %errorlevel% neq 0 (
    echo ✗ 部署失败
    pause
    exit /b 1
)
echo ✓ 部署成功
echo.

echo 步骤4: 重启服务...
ssh root@43.99.101.195 "systemctl restart patent-app && systemctl status patent-app"
if %errorlevel% neq 0 (
    echo ✗ 服务重启失败
    pause
    exit /b 1
)
echo ✓ 服务重启成功
echo.

echo ==========================================
echo 部署完成！
echo ==========================================
echo.
echo 验证步骤：
echo 1. 访问 http://43.99.101.195
echo 2. 测试功能八（附图标注）
echo 3. 上传说明书文本，检查部件提取准确率
echo.
pause
