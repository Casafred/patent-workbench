#!/bin/bash

# 企业微信配置一键添加脚本
# 使用方法: ./add_wecom_config.sh

ENV_FILE="/home/appuser/patent-app/.env"

echo "=========================================="
echo "企业微信配置添加脚本"
echo "=========================================="

# 检查 .env 文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: .env 文件不存在: $ENV_FILE"
    exit 1
fi

# 检查是否已配置
if grep -q "WECOM_CORP_ID" "$ENV_FILE"; then
    echo "检测到已有企业微信配置，当前内容："
    echo "------------------------------------------"
    grep "WECOM_" "$ENV_FILE"
    echo "------------------------------------------"
    read -p "是否要更新配置？: " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "已取消"
        exit 0
    fi
    # 删除旧配置
    sed -i '/WECOM_/d' "$ENV_FILE"
fi

# 交互式输入配置
echo ""
echo "请输入企业微信配置信息："
echo ""

read -p "企业ID (CorpID): " CORP_ID
if [ -z "$CORP_ID" ]; then
    echo "错误: 企业ID不能为空"
    exit 1
fi

read -p "应用AgentId: " AGENT_ID
if [ -z "$AGENT_ID" ]; then
    echo "错误: AgentId不能为空"
    exit 1
fi

read -p "应用Secret: " SECRET
if [ -z "$SECRET" ]; then
    echo "错误: Secret不能为空"
    exit 1
fi

read -p "回调Token (默认 patent2024wecom): " TOKEN
TOKEN=${TOKEN:-patent2024wecom}

read -p "EncodingAESKey (企业微信后台随机获取，留空则跳过加密): " AES_KEY
AES_KEY=${AES_KEY:-}

read -p "是否启用推送? [Y/n]: " ENABLED
ENABLED=${ENABLED:-Y}
if [[ "$ENABLED" =~ ^[Yy]$ ]]; then
    ENABLED_VALUE="true"
else
    ENABLED_VALUE="false"
fi

# 添加配置
echo "" >> "$ENV_FILE"
echo "# 企业微信推送配置" >> "$ENV_FILE"
echo "WECOM_CORP_ID=$CORP_ID" >> "$ENV_FILE"
echo "WECOM_AGENT_ID=$AGENT_ID" >> "$ENV_FILE"
echo "WECOM_SECRET=$SECRET" >> "$ENV_FILE"
echo "WECOM_TOKEN=$TOKEN" >> "$ENV_FILE"
if [ -n "$AES_KEY" ]; then
    echo "WECOM_ENCODING_AES_KEY=$AES_KEY" >> "$ENV_FILE"
fi
echo "WECOM_ENABLED=$ENABLED_VALUE" >> "$ENV_FILE"

echo ""
echo "=========================================="
echo "配置已添加成功！"
echo "=========================================="
echo ""
echo "当前企业微信配置："
grep "WECOM_" "$ENV_FILE"
echo ""
echo "=========================================="
echo "下一步操作："
echo "=========================================="
echo ""
echo "1. 在企业微信后台配置回调URL："
echo "   URL: https://ipx.asia/api/wecom/callback"
echo "   Token: $TOKEN"
if [ -n "$AES_KEY" ]; then
    echo "   EncodingAESKey: $AES_KEY"
fi
echo ""
echo "2. 重启服务："
echo "   systemctl restart patent-app"
