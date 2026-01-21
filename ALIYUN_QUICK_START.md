# 阿里云快速迁移指南（10分钟上线）

## 🎯 适用场景

- 日均 10 个用户
- 轻量级使用
- 无用户数据存储
- 从 Render 迁移

## 💰 推荐配置

```
配置：1核2G
系统：Ubuntu 22.04
费用：¥60/月
性能：完全够用
```

## 🚀 三步部署

### 步骤 1：购买服务器（3分钟）

1. 访问 [阿里云 ECS](https://ecs-buy.aliyun.com/)
2. 选择配置：
   - 地域：华东/华北（选离你近的）
   - 实例：1核2G（ecs.t6-c1m2.large）
   - 系统：Ubuntu 22.04 LTS
   - 带宽：按量付费 1-3Mbps
   - 存储：20GB 系统盘
3. 配置安全组：开放 22、80、443 端口
4. 设置 root 密码
5. 购买并启动

### 步骤 2：上传代码（2分钟）

**方法 A：使用 Git（推荐）**

```bash
# 在服务器上执行
ssh root@你的服务器IP
git clone https://github.com/你的用户名/你的仓库.git /root/patent-app
```

**方法 B：本地上传**

```bash
# 在本地项目目录执行（Windows PowerShell）
scp -r . root@你的服务器IP:/root/patent-app/
```

### 步骤 3：一键部署（5分钟）

```bash
# SSH 登录服务器
ssh root@你的服务器IP

# 进入项目目录
cd /root/patent-app

# 赋予执行权限
chmod +x scripts/deploy_aliyun.sh

# 运行部署脚本
./scripts/deploy_aliyun.sh
```

**按提示输入：**
- 数据库密码：随便设置一个强密码
- Flask Secret Key：直接回车自动生成
- 智谱AI API Key：如果有就填，没有留空
- 域名或IP：填你的服务器IP

等待 5 分钟，部署完成！

## ✅ 验证部署

访问 `http://你的服务器IP`，应该能看到登录页面。

## 🔧 常用命令

```bash
# 重启应用
systemctl restart patent-app

# 查看日志
tail -f /home/appuser/patent-app/logs/error.log

# 查看服务状态
systemctl status patent-app

# 更新代码
cd /home/appuser/patent-app
git pull
systemctl restart patent-app
```

## 🛡️ 配置 HTTPS（可选）

如果有域名，可以配置免费 HTTPS：

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d 你的域名

# 自动续期
systemctl enable certbot.timer
```

## 💡 与 Render 对比

| 项目 | Render 免费版 | 阿里云 1核2G |
|------|--------------|-------------|
| 费用 | ¥0 | ¥60/月 |
| 内存 | 512MB | 2GB |
| 休眠 | 15分钟无活动休眠 | 永不休眠 |
| 速度 | 国外服务器，较慢 | 国内服务器，快 |
| 数据库 | 90天删除 | 永久保存 |
| 稳定性 | 一般 | 很好 |

**结论：** 阿里云更稳定、更快、无休眠，性价比高。

## 📊 资源使用预估

日均 10 个用户的实际使用情况：

```
CPU：平均 5-10%，峰值 30%
内存：平均 800MB，峰值 1.2GB
带宽：日均 100MB，月均 3GB
存储：代码 2GB + 临时文件 5GB = 7GB
```

**1核2G 完全够用，还有很大余量！**

## 🔍 故障排查

### 应用无法访问

```bash
# 检查服务状态
systemctl status patent-app
systemctl status nginx

# 查看错误日志
tail -f /home/appuser/patent-app/logs/error.log
journalctl -u patent-app -n 50
```

### 502 错误

```bash
# 重启应用
systemctl restart patent-app

# 检查端口
netstat -tlnp | grep 5001
```

### 数据库连接失败

```bash
# 检查 PostgreSQL
systemctl status postgresql

# 测试连接
sudo -u postgres psql -l
```

## 📞 需要帮助？

查看完整文档：`docs/deployment/ALIYUN_MIGRATION_GUIDE.md`

## 🎉 完成！

现在你的应用已经在阿里云上运行了，比 Render 更快更稳定！

---

**预计总耗时：** 10 分钟
**难度：** 简单（一键脚本）
**成本：** ¥60/月
