# 🚀 部署命令 - 2026-02-07

## 方案A：使用自动化脚本（推荐）

### Windows用户：
```bash
deploy_with_rollback.bat
```

### Linux/Mac用户：
```bash
bash deploy_with_rollback.sh
```

---

## 方案B：手动执行（使用你的命令）

### 第一步：创建回退点
```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git branch rollback-point-20260207 && git log -1 --format='%H' > /tmp/last-stable-commit.txt && cat /tmp/last-stable-commit.txt"
```

### 第二步：部署（你的常用命令）
```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git pull origin main && chown -R appuser:appuser /home/appuser/patent-app && systemctl restart patent-app"
```

### 第三步：验证
```bash
ssh root@43.99.101.195 "systemctl status patent-app --no-pager | head -15"
```

### 第四步：查看日志（可选）
```bash
ssh root@43.99.101.195 "tail -n 50 /home/appuser/patent-app/logs/error.log"
```

---

## 🔄 如果出问题，立即回退

### 快速回退命令：
```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git reset --hard rollback-point-20260207 && systemctl restart patent-app"
```

---

## 📊 部署后验证清单

- [ ] 服务状态显示 `active (running)`
- [ ] 无错误日志
- [ ] 浏览器可以访问: http://43.99.101.195
- [ ] 登录功能正常
- [ ] 功能一：即时对话 ✓
- [ ] 功能二：异步批处理 ✓
- [ ] 功能七：权利要求处理 ✓
- [ ] 功能八：附图标记 ✓

---

## 💡 推荐执行方式

**我建议使用方案B（手动执行），因为：**
1. ✅ 你熟悉这个命令
2. ✅ 可以看到每一步的输出
3. ✅ 更容易排查问题
4. ✅ 只需要在前面加一步创建回退点

**执行顺序：**
1. 先执行"第一步：创建回退点"
2. 然后执行"第二步：部署"（你的常用命令）
3. 最后执行"第三步：验证"

**预计时间：** 2-3分钟

---

## 🎯 现在开始部署

**请复制以下命令，一条一条执行：**

```bash
# 1️⃣ 创建回退点
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git branch rollback-point-20260207 && git log -1 --format='%H' > /tmp/last-stable-commit.txt && echo '回退点已创建:' && cat /tmp/last-stable-commit.txt"

# 2️⃣ 部署（你的常用命令）
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git pull origin main && chown -R appuser:appuser /home/appuser/patent-app && systemctl restart patent-app"

# 3️⃣ 验证
ssh root@43.99.101.195 "systemctl status patent-app --no-pager | head -15"
```

**执行完成后，告诉我结果！**
