# IP验证功能启用指南（阿里云版）

> 在阿里云上启用IP验证，防止账号共享，提升安全性

## 📋 功能说明

### 什么是IP验证？

IP验证是一个安全功能，用于：
- 🔒 限制每个用户最多从5个不同IP登录
- 🔒 防止账号被多人共享
- 🔒 记录用户登录IP历史
- 🔒 异地登录时自动踢出旧会话

### 工作原理

```
用户登录 → 记录IP → 检查IP数量 → 超过5个删除最旧的 → 允许登录
         ↓
用户访问 → 验证IP → IP在数据库中 → 允许访问
         ↓
         IP不在数据库中 → 踢出登录
```

---

## ✅ 在阿里云上自动启用

好消息：**IP验证功能会自动启用！**

### 自动启用条件

当你按照部署指南部署后，以下条件满足时自动启用：

1. ✅ PostgreSQL已安装
2. ✅ 数据库已创建（patent_db）
3. ✅ DATABASE_URL已配置
4. ✅ 应用启动时自动创建user_ips表

**无需任何额外配置！**

---

## 🔍 验证IP功能是否启用

### 方法1：查看应用日志

```bash
# 查看启动日志
tail -f /home/appuser/patent-app/logs/error.log

# 应该看到：
# "成功连接到 PostgreSQL 服务器。"
# "数据库表 'user_ips' 已准备就绪。"
```

### 方法2：检查数据库表

```bash
# 登录数据库
sudo -u postgres psql -d patent_db

# 查看表
\dt

# 应该看到 user_ips 表

# 查看表结构
\d user_ips

# 应该显示：
# id | username | ip_address | first_seen

# 退出
\q
```

### 方法3：测试功能

1. **登录应用**
   - 访问 http://你的服务器IP
   - 使用 admin/admin123 登录

2. **查看IP记录**
   ```bash
   sudo -u postgres psql -d patent_db
   SELECT * FROM user_ips;
   # 应该看到你的登录IP
   \q
   ```

3. **测试IP限制**
   - 从不同设备/网络登录6次
   - 第6次登录时，第1次的IP会被自动删除

---

## ⚙️ 配置选项

### 修改IP数量限制

默认每个用户最多5个IP，可以修改：

**方法1：修改.env文件**
```bash
su - appuser
cd ~/patent-app
nano .env

# 添加或修改
MAX_IPS_PER_USER=10  # 改为10个IP

# 保存后重启
exit
systemctl restart patent-app
```

**方法2：修改环境变量**
```bash
# 编辑systemd服务
nano /etc/systemd/system/patent-app.service

# 在[Service]部分添加
Environment="MAX_IPS_PER_USER=10"

# 重新加载并重启
systemctl daemon-reload
systemctl restart patent-app
```

### 推荐配置

| 场景 | 推荐IP数量 | 说明 |
|------|-----------|------|
| 个人使用 | 3-5 | 家里、公司、手机 |
| 小团队 | 5-10 | 多个办公地点 |
| 严格限制 | 1-2 | 防止共享 |
| 宽松限制 | 10-20 | 灵活使用 |

---

## 🔒 安全特性

### 1. 自动IP管理

```python
# 代码已实现（无需修改）
- 登录时自动记录IP
- 超过限制自动删除最旧IP
- 异地登录自动踢出
```

### 2. 会话验证

```python
# 每次API请求都会验证
- 检查session是否存在
- 检查IP是否在数据库中
- IP不匹配自动清除session
```

### 3. 向后兼容

```python
# 如果数据库不可用
- 自动跳过IP验证
- 不影响正常使用
- 日志记录警告
```

---

## 📊 查看IP使用情况

### 查看所有用户的IP

```bash
sudo -u postgres psql -d patent_db

# 查看所有IP记录
SELECT username, ip_address, first_seen 
FROM user_ips 
ORDER BY username, first_seen DESC;

# 查看每个用户的IP数量
SELECT username, COUNT(*) as ip_count 
FROM user_ips 
GROUP BY username;

# 退出
\q
```

### 查看特定用户的IP

```bash
sudo -u postgres psql -d patent_db

# 查看admin用户的IP
SELECT * FROM user_ips WHERE username = 'admin';

\q
```

### 删除特定用户的IP

```bash
sudo -u postgres psql -d patent_db

# 删除admin用户的所有IP（强制重新登录）
DELETE FROM user_ips WHERE username = 'admin';

# 删除特定IP
DELETE FROM user_ips WHERE ip_address = '1.2.3.4';

\q
```

---

## 🚨 故障排查

### 问题1：IP验证未启用

**症状：**
- 日志显示"未找到 DATABASE_URL"
- 可以从任意IP登录

**解决：**
```bash
# 检查.env文件
cat /home/appuser/patent-app/.env | grep DATABASE_URL

# 应该有：
# DATABASE_URL=postgresql://patent_user:密码@localhost/patent_db

# 如果没有，添加后重启
systemctl restart patent-app
```

### 问题2：user_ips表不存在

**症状：**
- 日志显示"relation 'user_ips' does not exist"

**解决：**
```bash
# 手动创建表
sudo -u postgres psql -d patent_db

CREATE TABLE IF NOT EXISTS user_ips (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (username, ip_address)
);

\q

# 重启应用
systemctl restart patent-app
```

### 问题3：频繁被踢出登录

**症状：**
- 经常需要重新登录
- 提示"Session expired"

**原因：**
- IP地址经常变化（动态IP）
- 使用VPN或代理

**解决：**
```bash
# 方案1：增加IP数量限制
nano /home/appuser/patent-app/.env
# 修改：MAX_IPS_PER_USER=20

# 方案2：禁用IP验证（不推荐）
# 删除DATABASE_URL环境变量
# 或者修改代码跳过验证
```

### 问题4：无法从新设备登录

**症状：**
- 已经有5个IP
- 新设备无法登录

**解决：**
```bash
# 查看当前IP
sudo -u postgres psql -d patent_db
SELECT * FROM user_ips WHERE username = 'admin';

# 删除不用的IP
DELETE FROM user_ips WHERE username = 'admin' AND ip_address = '旧IP';

\q
```

---

## 🎯 最佳实践

### 1. 定期清理旧IP

```bash
# 创建清理脚本
cat > /root/cleanup_old_ips.sh << 'EOF'
#!/bin/bash
# 删除30天未使用的IP
sudo -u postgres psql -d patent_db << SQL
DELETE FROM user_ips 
WHERE first_seen < NOW() - INTERVAL '30 days';
SQL
EOF

chmod +x /root/cleanup_old_ips.sh

# 添加到crontab（每周执行）
crontab -e
# 添加：
0 3 * * 0 /root/cleanup_old_ips.sh
```

### 2. 监控IP使用

```bash
# 创建监控脚本
cat > /root/monitor_ips.sh << 'EOF'
#!/bin/bash
# 检查是否有用户超过IP限制
sudo -u postgres psql -d patent_db -t -c "
SELECT username, COUNT(*) as ip_count 
FROM user_ips 
GROUP BY username 
HAVING COUNT(*) > 5;
"
EOF

chmod +x /root/monitor_ips.sh

# 每天检查
crontab -e
# 添加：
0 9 * * * /root/monitor_ips.sh | mail -s "IP使用报告" your@email.com
```

### 3. 备份IP数据

```bash
# 备份user_ips表
sudo -u postgres pg_dump -d patent_db -t user_ips > user_ips_backup.sql

# 恢复
sudo -u postgres psql -d patent_db < user_ips_backup.sql
```

---

## 📈 性能影响

### 资源消耗

- **CPU**: 几乎无影响（<1%）
- **内存**: 每个IP记录约100字节
- **磁盘**: 1000个用户 × 5个IP = 约500KB
- **查询速度**: <1ms（有索引）

### 优化建议

```sql
-- 如果IP记录很多，添加索引
CREATE INDEX idx_user_ips_username ON user_ips(username);
CREATE INDEX idx_user_ips_ip ON user_ips(ip_address);
```

---

## 🔐 安全建议

### 1. 合理设置IP限制

```
个人用户：3-5个IP
企业用户：5-10个IP
严格模式：1-2个IP
```

### 2. 结合其他安全措施

- ✅ 强密码策略
- ✅ 定期修改密码
- ✅ 启用HTTPS
- ✅ 配置防火墙
- ✅ 监控异常登录

### 3. 记录审计日志

```python
# 可以扩展代码记录更多信息
- 登录时间
- 登录地点（IP地理位置）
- 登录设备（User-Agent）
- 失败尝试次数
```

---

## 📝 总结

### 在阿里云上的优势

| 功能 | Render | 阿里云 |
|------|--------|--------|
| IP验证 | ❌ 无数据库 | ✅ 完全支持 |
| 数据持久化 | ❌ 90天删除 | ✅ 永久保存 |
| 性能 | 一般 | 优秀 |
| 成本 | ¥600/年 | ¥99/年 |

### 启用步骤

1. ✅ 按照部署指南部署（自动启用）
2. ✅ 验证功能是否启用
3. ✅ 根据需要调整IP限制
4. ✅ 定期监控和维护

### 常用命令

```bash
# 查看IP记录
sudo -u postgres psql -d patent_db -c "SELECT * FROM user_ips;"

# 删除用户IP
sudo -u postgres psql -d patent_db -c "DELETE FROM user_ips WHERE username = 'admin';"

# 修改IP限制
nano /home/appuser/patent-app/.env
# MAX_IPS_PER_USER=10

# 重启应用
systemctl restart patent-app
```

---

**IP验证功能在阿里云上完全可用，无需额外配置！** 🎉
