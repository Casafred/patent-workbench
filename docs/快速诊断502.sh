#!/bin/bash
# 快速诊断502错误

echo "========================================="
echo "快速诊断502错误 - 2026年2月4日"
echo "========================================="
echo ""

echo "[1/6] 查看服务状态..."
systemctl status patent-app.service | head -20

echo ""
echo "[2/6] 查看最新错误日志..."
journalctl -u patent-app.service -n 30 --no-pager | tail -20

echo ""
echo "[3/6] 检查Python语法..."
cd /root/patent-workbench
python3 -m py_compile backend/scraper/simple_scraper.py 2>&1

echo ""
echo "[4/6] 测试导入..."
python3 -c "from backend.scraper.simple_scraper import SimplePatentScraper; print('✓ 导入成功')" 2>&1

echo ""
echo "[5/6] 检查端口占用..."
netstat -tlnp | grep 5000

echo ""
echo "[6/6] 检查Nginx状态..."
systemctl status nginx | head -10

echo ""
echo "========================================="
echo "诊断完成"
echo "========================================="
