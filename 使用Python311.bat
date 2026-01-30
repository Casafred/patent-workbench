@echo off
chcp 65001 >nul
echo ========================================
echo 切换到Python 3.11并安装RapidOCR
echo ========================================
echo.
echo 发现: 服务器已有Python 3.11！
echo 当前: 应用使用Python 3.6
echo 解决: 切换到Python 3.11
echo.

echo [1/5] 创建Python 3.11虚拟环境...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3.11 -m venv venv311'"
if errorlevel 1 (
    echo ❌ 创建失败，尝试安装venv模块...
    ssh root@43.99.101.195 "yum install -y python3.11-pip"
    ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3.11 -m venv venv311'"
)
echo ✅ 虚拟环境已创建
echo.

echo [2/5] 升级pip...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && pip install --upgrade pip && deactivate'"
echo.

echo [3/5] 安装所有依赖（包括RapidOCR）...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && pip install -r requirements.txt && deactivate'"
if errorlevel 1 (
    echo ❌ 安装失败，尝试使用国内镜像...
    ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt && deactivate'"
)
echo ✅ 依赖已安装
echo.

echo [4/5] 验证安装...
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && python -c \"from rapidocr_onnxruntime import RapidOCR; import cv2; from PIL import Image; print(\\\"✅ 所有依赖已安装\\\")\" && deactivate'"
echo.

echo [5/5] 更新systemd服务配置...
echo.
echo ⚠️ 需要手动修改服务配置:
echo.
echo 1. 运行以下命令编辑服务:
echo    ssh root@43.99.101.195 "systemctl edit --full patent-app"
echo.
echo 2. 找到 ExecStart 行，修改为:
echo    ExecStart=/home/appuser/patent-app/venv311/bin/python /home/appuser/patent-app/app.py
echo    或
echo    ExecStart=/home/appuser/patent-app/venv311/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app
echo.
echo 3. 保存后运行:
echo    ssh root@43.99.101.195 "systemctl daemon-reload"
echo    ssh root@43.99.101.195 "systemctl restart patent-app"
echo.

pause

echo.
echo 是否现在打开SSH连接以修改配置？(y/n)
set /p choice=
if /i "%choice%"=="y" (
    echo 正在连接...
    ssh root@43.99.101.195
)
