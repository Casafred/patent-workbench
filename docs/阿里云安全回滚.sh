#!/bin/bash
# 阿里云服务器安全回滚脚本

echo "======================================"
echo "阿里云服务器安全回滚"
echo "======================================"
echo ""

# 进入项目目录
cd /home/appuser/patent-app

echo "当前位置: $(pwd)"
echo ""

# 1. 创建备份分支（保存OCR修复）
echo "[步骤1] 创建备份分支保存OCR修复..."
git branch backup-ocr-fix-20260130
echo "✅ 备份分支已创建: backup-ocr-fix-20260130"
echo ""

# 2. 查看完整的提交历史
echo "[步骤2] 查看提交历史..."
git log --oneline -20
echo ""

# 3. 回滚到OCR修复之前的版本
echo "[步骤3] 回滚到 db0dba5 之前的版本..."
git reset --hard HEAD~1
echo "✅ 已回滚到上一个版本"
echo ""

# 4. 显示当前版本
echo "[步骤4] 当前版本信息:"
git log -1
echo ""

# 5. 修复文件权限
echo "[步骤5] 修复文件权限..."
chown -R appuser:appuser /home/appuser/patent-app
echo "✅ 文件权限已修复"
echo ""

# 6. 重启服务
echo "[步骤6] 重启服务..."
systemctl restart patent-app
sleep 2
systemctl status patent-app --no-pager
echo ""

echo "======================================"
echo "✅ 回滚完成！"
echo "======================================"
echo ""
echo "如果需要恢复OCR修复，执行："
echo "git reset --hard backup-ocr-fix-20260130"
echo ""
echo "查看服务日志："
echo "journalctl -u patent-app -f"
