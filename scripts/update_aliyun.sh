#!/bin/bash
# 阿里云服务器代码更新脚本
# 使用方法：bash scripts/update_aliyun.sh

echo "=========================================="
echo "  阿里云服务器代码更新"
echo "=========================================="
echo ""

# 服务器IP
SERVER_IP="43.99.101.195"

echo "正在连接到服务器 $SERVER_IP ..."
echo ""

# 执行更新命令
ssh root@$SERVER_IP << 'ENDSSH'
echo "1. 切换到项目目录..."
cd /home/appuser/patent-app || exit 1

echo "2. 切换到appuser用户并拉取代码..."
su - appuser -c "cd ~/patent-app && git pull origin main"

echo "3. 重启应用服务..."
systemctl restart patent-app

echo "4. 检查服务状态..."
systemctl status patent-app --no-pager | head -10

echo ""
echo "=========================================="
echo "✓ 更新完成！"
echo "=========================================="
echo ""
echo "访问地址: http://43.99.101.195"
echo ""
ENDSSH

echo ""
echo "本地操作完成！"
