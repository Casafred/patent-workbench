#!/bin/bash
# 部署功能八部件提取算法更新（基于jieba分词）

echo "=========================================="
echo "部署功能八部件提取算法更新"
echo "=========================================="

# 1. 检查虚拟环境
echo ""
echo "步骤1: 检查虚拟环境..."
if [ -d ~/patent-app/venv311 ]; then
    VENV_PATH="~/patent-app/venv311"
    echo "✓ 使用 venv311"
elif [ -d ~/patent-app/venv ]; then
    VENV_PATH="~/patent-app/venv"
    echo "✓ 使用 venv"
else
    echo "✗ 错误：未找到虚拟环境"
    exit 1
fi

# 2. 进入项目目录
echo ""
echo "步骤2: 进入项目目录..."
cd ~/patent-app || exit 1
echo "✓ 当前目录: $(pwd)"

# 3. 拉取最新代码
echo ""
echo "步骤3: 拉取最新代码..."
git pull origin main
if [ $? -eq 0 ]; then
    echo "✓ 代码拉取成功"
else
    echo "✗ 代码拉取失败"
    exit 1
fi

# 4. 激活虚拟环境
echo ""
echo "步骤4: 激活虚拟环境..."
source $VENV_PATH/bin/activate
echo "✓ Python版本: $(python --version)"
echo "✓ pip版本: $(pip --version)"

# 5. 安装/更新依赖
echo ""
echo "步骤5: 安装jieba分词库..."
pip install jieba
if [ $? -eq 0 ]; then
    echo "✓ jieba安装成功"
else
    echo "✗ jieba安装失败"
    exit 1
fi

# 6. 验证jieba安装
echo ""
echo "步骤6: 验证jieba安装..."
python -c "import jieba; print('jieba版本:', jieba.__version__)"
if [ $? -eq 0 ]; then
    echo "✓ jieba验证成功"
else
    echo "✗ jieba验证失败"
    exit 1
fi

# 7. 测试部件提取器
echo ""
echo "步骤7: 测试部件提取器..."
python -c "
from backend.utils.component_extractor import extract_reference_markers, get_extraction_stats
stats = get_extraction_stats()
print('提取器状态:', stats)
test_text = '扳机开关202设置在手柄712内。'
result = extract_reference_markers(test_text)
print('测试结果:', result)
"
if [ $? -eq 0 ]; then
    echo "✓ 部件提取器测试成功"
else
    echo "✗ 部件提取器测试失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "部署完成！现在需要重启服务。"
echo "=========================================="
echo ""
echo "请以root用户执行："
echo "  systemctl restart patent-app"
echo "  systemctl status patent-app"
