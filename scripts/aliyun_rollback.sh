#!/bin/bash
# 阿里云服务器安全回退脚本
# 使用方法: bash scripts/aliyun_rollback.sh [commit_hash]
# 如果不提供commit_hash，则回退到上一个版本

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 服务器配置
SERVER_IP="43.99.101.195"
SERVER_USER="root"
PROJECT_PATH="/home/appuser/patent-app"
SERVICE_NAME="patent-app"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  阿里云服务器安全回退工具${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# 检查是否提供了commit hash
COMMIT_HASH=$1

if [ -z "$COMMIT_HASH" ]; then
    echo -e "${YELLOW}⚠️  未提供commit hash，将回退到上一个版本${NC}"
    ROLLBACK_CMD="git reset --hard HEAD~1"
else
    echo -e "${GREEN}✓ 将回退到指定版本: $COMMIT_HASH${NC}"
    ROLLBACK_CMD="git reset --hard $COMMIT_HASH"
fi

echo ""
echo -e "${YELLOW}准备执行以下操作:${NC}"
echo "1. 连接到服务器: $SERVER_USER@$SERVER_IP"
echo "2. 进入项目目录: $PROJECT_PATH"
echo "3. 创建紧急备份分支"
echo "4. 执行回退: $ROLLBACK_CMD"
echo "5. 重启服务: $SERVICE_NAME"
echo "6. 验证服务状态"
echo ""

read -p "确认执行回退操作? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}✗ 操作已取消${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}开始执行回退...${NC}"
echo ""

# 执行回退
ssh $SERVER_USER@$SERVER_IP << EOF
    set -e
    
    echo "========================================="
    echo "1. 进入项目目录"
    echo "========================================="
    cd $PROJECT_PATH
    pwd
    echo ""
    
    echo "========================================="
    echo "2. 查看当前版本"
    echo "========================================="
    echo "当前commit:"
    git log -1 --oneline
    echo ""
    
    echo "========================================="
    echo "3. 创建紧急备份分支"
    echo "========================================="
    BACKUP_BRANCH="emergency-backup-\$(date +%Y%m%d-%H%M%S)"
    git branch \$BACKUP_BRANCH
    echo "✓ 已创建备份分支: \$BACKUP_BRANCH"
    echo ""
    
    echo "========================================="
    echo "4. 执行回退"
    echo "========================================="
    $ROLLBACK_CMD
    echo "✓ 回退完成"
    echo ""
    
    echo "回退后的版本:"
    git log -1 --oneline
    echo ""
    
    echo "========================================="
    echo "5. 重启服务"
    echo "========================================="
    systemctl restart $SERVICE_NAME
    sleep 3
    echo "✓ 服务已重启"
    echo ""
    
    echo "========================================="
    echo "6. 验证服务状态"
    echo "========================================="
    systemctl status $SERVICE_NAME --no-pager -l
    echo ""
    
    echo "========================================="
    echo "7. 测试服务响应"
    echo "========================================="
    curl -s -o /dev/null -w "HTTP状态码: %{http_code}\n" http://localhost:5001 || echo "⚠️  服务可能未完全启动"
    echo ""
EOF

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  回退操作完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}后续步骤:${NC}"
echo "1. 访问网站验证功能: https://ipx.asia"
echo "2. 查看错误日志: ssh $SERVER_USER@$SERVER_IP 'tail -f $PROJECT_PATH/logs/error.log'"
echo "3. 如果需要恢复，可以切换到备份分支"
echo ""
echo -e "${YELLOW}查看所有备份分支:${NC}"
echo "ssh $SERVER_USER@$SERVER_IP 'cd $PROJECT_PATH && git branch | grep emergency-backup'"
echo ""
