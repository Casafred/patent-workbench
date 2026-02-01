@echo off
REM AI说明书处理器部署脚本 - Windows版本
REM 用于本地开发环境和Windows服务器部署

echo ========================================
echo AI说明书处理器部署脚本
echo ========================================
echo.

REM 检查Python环境
echo [1/6] 检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)
echo ✓ Python环境正常
echo.

REM 检查虚拟环境
echo [2/6] 检查虚拟环境...
if not exist "venv" (
    echo 创建虚拟环境...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo ✓ 虚拟环境已激活
echo.

REM 安装依赖
echo [3/6] 安装Python依赖...
pip install -r requirements.txt
if errorlevel 1 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)
echo ✓ 依赖安装完成
echo.

REM 检查配置文件
echo [4/6] 检查配置文件...
if not exist ".env" (
    echo 警告: .env 文件不存在，从示例文件复制...
    copy .env.example .env
    echo.
    echo 重要: 请编辑 .env 文件并配置 ZHIPU_API_KEY
    echo.
)

if not exist "config\models.json" (
    echo 错误: config\models.json 不存在
    pause
    exit /b 1
)
echo ✓ 配置文件检查完成
echo.

REM 验证配置
echo [5/6] 验证配置...
python -c "import os; api_key = os.getenv('ZHIPU_API_KEY'); exit(0 if api_key and api_key != 'your-zhipu-api-key-here' else 1)"
if errorlevel 1 (
    echo.
    echo 警告: ZHIPU_API_KEY 未正确配置
    echo 请编辑 .env 文件并设置有效的API密钥
    echo.
    echo 按任意键继续（将使用用户级API密钥）...
    pause >nul
) else (
    echo ✓ API密钥已配置
)
echo.

REM 运行测试
echo [6/6] 运行功能测试...
echo 启动测试服务器...
echo.
echo 测试页面: http://localhost:5001/test_ai_description_processor.html
echo.
echo 按 Ctrl+C 停止服务器
echo.

python run_app.py

echo.
echo ========================================
echo 部署完成
echo ========================================
pause
