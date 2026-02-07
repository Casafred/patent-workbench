# 🚀 立即部署指南

## ✅ 第一步：本地准备 - 已完成！

- [x] 代码已提交
- [x] 已推送到GitHub (commit: 60a8a3b)
- [x] 创建备份分支: backup-before-deploy-20260207

---

## 📍 第二步：SSH登录阿里云

**请在PowerShell中执行：**

```bash
ssh root@你的服务器IP
```

---

## 📍 第三步：创建回退点（在服务器上执行）

```bash
cd /home/appuser/patent-app
git branch rollback-point-20260207
git log -1 --format="%H" > /tmp/last-stable-commit.txt
cat /tmp/last-stable-commit.txt
```

---

## 📍 第四步：拉取最新代码

```bash
git pull origin main
```

---

## 📍 第五步：重启服务

```bash
systemctl restart patent-app
systemctl status patent-app
```

---

## 📍 第六步：验证

1. 查看日志：`tail -n 50 /home/appuser/patent-app/logs/error.log`
2. 测试访问：`curl http://localhost:5001`
3. 浏览器访问：`http://你的服务器IP`

---

## 🔄 如果出问题，立即回退：

```bash
git reset --hard rollback-point-20260207
systemctl restart patent-app
```

---

**现在请告诉我你的服务器IP，我会帮你准备具体的命令！**
