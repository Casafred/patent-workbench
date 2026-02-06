@echo off
chcp 65001 >nul
echo ========================================
echo 功能六引用专利增强 - 快速部署
echo ========================================
echo.

echo [1/5] 检查修改的文件...
git status

echo.
echo [2/5] 添加修改的文件到Git...
git add backend/scraper/simple_scraper.py
git add js/patentDetailNewTab.js
git add frontend/css/components/modals.css
git add 功能六引用专利增强完成_20260204.md
git add git_commit_citations_enhancement.txt
git add test_citations_enhancement.html

echo.
echo [3/5] 提交更改...
git commit -F git_commit_citations_enhancement.txt

echo.
echo [4/5] 推送到远程仓库...
git push origin main

echo.
echo [5/5] 部署完成！
echo.
echo ========================================
echo 修复内容：
echo ✓ 移除引用专利20条数量限制
echo ✓ 支持审查员引用标记（红色星号*）
echo ✓ 优化左侧导航栏位置（left: 5px）
echo ✓ 改进关闭按钮样式（突出于右上角）
echo ========================================
echo.
echo 测试方法：
echo 1. 打开 test_citations_enhancement.html 查看详细测试指南
echo 2. 在功能六中搜索专利：CN104154208B
echo 3. 点击"新标签页打开"验证所有修复
echo.
echo 按任意键退出...
pause >nul
