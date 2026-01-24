# 阿里云¥99/年 - 5分钟快速部署

> 最简单的部署方法，适合想快速上线的用户

## 🚀 超快速部署（推荐）

### 第一步：购买ECS（2分钟）

1. 访问：https://www.aliyun.com/activity
2. 选择：1核2G，Ubuntu 22.04 LTS，¥99/年
3. 配置安全组：开放 22、80、443 端口
4. 记录：服务器IP和root密码

### 第二步：运行自动脚本（10分钟）

**在你的电脑上（Windows PowerShell）：**

```powershell
# 1. SSH登录服务器
ssh root@你的服务器IP
# 输入密码

# 2. 下载部署脚本
wget https://raw.githubusercontent.com/你的用户名/你的仓库/main/scripts/aliyun_auto_deploy.sh

# 3. 运行脚本
bash aliyun_auto_deploy.sh
```

**按提示输入：**
1. GitHub仓库地址
2. 数据库密码（建议强密码）
3. 智谱AI API密钥（可选，按回车跳过）

**等待完成，喝杯咖啡 ☕**

### 第三步：访问应用（1分钟）

浏览器打开：`http://你的服务器IP`

**默认账号：**
- 用户名：`admin`
- 密码：`admin123`

**完成！** 🎉

---

## 📱 如果自动脚本失败

### 方案A：手动创建脚本

```bash
# 1. SSH登录
ssh root@你的服务器IP

# 2. 创建脚本文件
nano deploy.sh

# 3. 复制 scripts/aliyun_auto_deploy.sh 的全部内容
# 粘贴到nano编辑器中

# 4. 保存：Ctrl+X, Y, Enter

# 5. 运行
bash deploy.sh
```

### 方案B：使用详细手动步骤

查看：`docs/deployment/ALIYUN_MIGRATION_GUIDE.md`

按照"方法二：手动部署"的21个步骤操作

---

## ✅ 部署成功标志

- ✅ 浏览器能访问 http://你的IP
- ✅ 能看到登录页面
- ✅ 能用 admin/admin123 登录
- ✅ 能上传Excel文件
- ✅ 能查询专利

---

## 🆘 常见问题

### 问题1：无法访问网站

**检查阿里云安全组：**
1. 登录阿里云控制台
2. ECS → 安全组 → 配置规则
3. 确保有入方向规则：80/TCP，0.0.0.0/0

**检查服务状态：**
```bash
systemctl status patent-app
systemctl status nginx
```

### 问题2：502 Bad Gateway

```bash
# 重启应用
systemctl restart patent-app

# 查看日志
tail -f /home/appuser/patent-app/logs/error.log
```

### 问题3：数据库连接失败

```bash
# 检查PostgreSQL
systemctl status postgresql

# 检查.env文件
cat /home/appuser/patent-app/.env
```

---

## 📞 获取帮助

**查看完整文档：**
- 详细部署指南：`docs/deployment/ALIYUN_MIGRATION_GUIDE.md`
- 部署检查清单：`docs/deployment/DEPLOYMENT_CHECKLIST_99.md`

**查看日志：**
```bash
# 应用日志
tail -f /home/appuser/patent-app/logs/error.log

# 系统日志
journalctl -u patent-app -f
```

**重启服务：**
```bash
systemctl restart patent-app
systemctl restart nginx
```

---

## 🎯 部署后必做

1. **修改默认密码**
   - 登录后台
   - 修改admin密码

2. **测试所有功能**
   - Excel上传
   - 专利查询
   - 权利要求处理
   - 即时对话

3. **配置HTTPS**（可选）
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d 你的域名
   ```

4. **设置备份**
   ```bash
   # 数据库备份
   sudo -u postgres pg_dump patent_db > backup.sql
   ```

---

## 💡 性能优化建议

**1核2G配置优化：**
- ✅ 已优化：Gunicorn 2 workers
- ✅ 已优化：超时时间120秒
- ✅ 已优化：日志轮转

**如果用户增多（>20人/天）：**
- 升级到2核4G
- 增加Gunicorn workers
- 配置Redis缓存

---

## 📊 费用说明

**¥99/年包含：**
- 1核2G服务器
- 1Mbps固定带宽
- 20GB存储
- 24小时运行
- 无休眠

**额外费用（可选）：**
- 域名：¥50-100/年
- HTTPS证书：免费（Let's Encrypt）
- 备份快照：¥0.12/GB/月

**总计：** ¥99-200/年

---

## 🎉 恭喜！

你已经成功将应用部署到阿里云！

**享受：**
- ✅ 无休眠，随时访问
- ✅ 国内访问快
- ✅ 稳定可靠
- ✅ 每天只需¥0.27

**下一步：**
- 分享给你的用户
- 收集反馈
- 持续优化

---

**部署时间：** 10-15分钟  
**难度：** ⭐⭐（非常简单）  
**成功率：** 99%
