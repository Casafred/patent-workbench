#!/bin/bash
# ========================================
# 部署404修复到阿里云服务器
# 日期: 2026-02-07
# ========================================

set -e  # 遇到错误立即退出

echo ""
echo "========================================"
echo "部署404修复到阿里云服务器"
echo "========================================"
echo ""

echo "[步骤1] 拉取最新代码..."
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git pull origin main"
echo "[完成] 代码拉取成功"
echo ""

echo "[步骤2] 修复文件权限..."
ssh root@43.99.101.195 "chown -R appuser:appuser /home/appuser/patent-app" || echo "[警告] 权限修复失败，但继续执行"
echo "[完成] 权限修复完成"
echo ""

echo "[步骤3] 重启服务..."
ssh root@43.99.101.195 "systemctl restart patent-app"
echo "[完成] 服务重启成功"
echo ""

echo "[步骤4] 检查服务状态..."
ssh root@43.99.101.195 "systemctl status patent-app --no-pager -l"
echo ""

echo "========================================"
echo "部署完成！"
echo "========================================"
echo ""
echo "请访问 https://ipx.asia 验证修复"
echo ""
echo "验证清单："
echo "1. 打开浏览器开发者工具 (F12)"
echo "2. 切换到 Network 标签"
echo "3. 刷新页面"
echo "4. 检查所有 .html 文件是否返回 200 状态码"
echo "5. 检查 Console 标签是否有 '✅ component loaded' 消息"
echo ""
