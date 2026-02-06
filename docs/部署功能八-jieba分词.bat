@echo off
chcp 65001 >nul
echo ==========================================
echo 部署功能八 - 基于jieba分词的智能提取
echo ==========================================
echo.

echo 步骤1: 提交并推送代码到GitHub...
git add .
git commit -m "功能八：添加基于jieba分词的智能部件提取算法"
git push origin main
if %errorlevel% neq 0 (
    echo ✗ 推送失败，请检查git状态
    pause
    exit /b 1
)
echo ✓ 代码推送成功
echo.

echo 步骤2: 在服务器上拉取代码并安装依赖...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git pull origin main && source venv311/bin/activate && pip install jieba && python -c \"import jieba; print(\"jieba版本:\", jieba.__version__)\"'"
if %errorlevel% neq 0 (
    echo ✗ 部署失败
    pause
    exit /b 1
)
echo ✓ 依赖安装成功
echo.

echo 步骤3: 重启服务...
ssh root@43.99.101.195 "systemctl restart patent-app"
if %errorlevel% neq 0 (
    echo ✗ 服务重启失败
    pause
    exit /b 1
)
echo ✓ 服务重启成功
echo.

echo 步骤4: 检查服务状态...
ssh root@43.99.101.195 "systemctl status patent-app --no-pager -l"
echo.

echo ==========================================
echo 部署完成！
echo ==========================================
echo.
echo 验证步骤：
echo 1. 访问 http://43.99.101.195
echo 2. 登录系统
echo 3. 测试功能八（附图标注）
echo 4. 上传说明书文本，检查部件提取准确率
echo.
echo 预期改进：
echo - 准确识别名词性部件名称
echo - 避免提取动词和描述性文字
echo - 支持多词组合（如"第二电路板"）
echo - 准确率提升至80-90%%
echo.
pause
