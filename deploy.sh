#!/bin/bash

# Render 部署脚本
# 此脚本帮助你快速准备和推送代码到 GitHub

echo "=========================================="
echo "  Patent Analysis Workbench - 部署助手"
echo "=========================================="
echo ""

# 检查是否在 Git 仓库中
if [ ! -d .git ]; then
    echo "❌ 错误: 当前目录不是 Git 仓库"
    echo "请先运行: git init"
    exit 1
fi

echo "✓ Git 仓库检查通过"
echo ""

# 检查关键文件
echo "检查关键文件..."
files=("wsgi.py" "Procfile" "requirements.txt" "runtime.txt" ".gitignore")
missing_files=()

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ❌ $file (缺失)"
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo ""
    echo "❌ 缺少必需文件，请先创建这些文件"
    exit 1
fi

echo ""
echo "✓ 所有关键文件检查通过"
echo ""

# 检查敏感文件
echo "检查敏感文件..."
if git ls-files | grep -q "users.json"; then
    echo "  ⚠️  警告: users.json 被 Git 追踪"
    echo "  建议运行: git rm --cached users.json"
fi

if git ls-files | grep -q ".env"; then
    echo "  ⚠️  警告: .env 被 Git 追踪"
    echo "  建议运行: git rm --cached .env"
fi

echo ""

# 显示当前状态
echo "当前 Git 状态:"
git status --short
echo ""

# 询问是否继续
read -p "是否要提交并推送代码? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "部署已取消"
    exit 0
fi

# 获取提交信息
read -p "请输入提交信息 (默认: Deploy to Render): " commit_msg
commit_msg=${commit_msg:-"Deploy to Render"}

# 添加所有文件
echo ""
echo "添加文件到 Git..."
git add .

# 提交
echo "提交更改..."
git commit -m "$commit_msg"

# 获取远程分支
read -p "请输入要推送的分支 (默认: main): " branch
branch=${branch:-"main"}

# 推送
echo ""
echo "推送到 GitHub..."
git push origin "$branch"

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✓ 代码已成功推送到 GitHub!"
    echo "=========================================="
    echo ""
    echo "下一步:"
    echo "1. 登录 Render Dashboard"
    echo "2. 检查部署状态"
    echo "3. 配置环境变量（如果还没有）:"
    echo "   - ZHIPUAI_API_KEY"
    echo "   - FLASK_SECRET_KEY"
    echo "4. 等待部署完成"
    echo ""
    echo "查看完整指南: QUICK_DEPLOY.md"
else
    echo ""
    echo "❌ 推送失败，请检查错误信息"
    exit 1
fi
