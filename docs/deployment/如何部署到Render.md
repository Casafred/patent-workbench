# 如何将项目部署到 Render

## 📌 概述

你已经在 Render 上通过 GitHub 部署了一个网站，现在想要替换成当前的专利分析工作台项目。这个指南将帮助你完成这个过程。

---

## 🎯 部署方式选择

### 方式一：替换现有项目（推荐）

如果你想保留现有的 Render 服务配置，只需要替换 GitHub 仓库的代码：

#### 步骤：

1. **备份旧代码（可选）**
   ```bash
   # 在你的 GitHub 仓库中创建备份分支
   git checkout -b backup-old-version
   git push origin backup-old-version
   git checkout main
   ```

2. **替换为新代码**
   ```bash
   # 删除旧文件（保留 .git 文件夹）
   # 将当前项目的所有文件复制到你的 GitHub 仓库文件夹
   
   # 或者直接在当前项目文件夹操作
   git init  # 如果还没有初始化
   git remote add origin <你的GitHub仓库地址>
   ```

3. **推送新代码**
   ```bash
   git add .
   git commit -m "Replace with Patent Analysis Workbench"
   git push origin main -f  # 强制推送（会覆盖远程仓库）
   ```

4. **Render 自动重新部署**
   - Render 检测到代码更新后会自动开始部署
   - 在 Render Dashboard 查看部署进度

5. **配置环境变量（可选）**
   - 在 Render Dashboard → 你的服务 → Environment
   - `FLASK_SECRET_KEY` 会自动生成
   - 其他变量使用默认值即可

---

### 方式二：创建新的 Render 服务

如果你想保留旧项目，可以创建一个新的 Render 服务：

#### 步骤：

1. **创建新的 GitHub 仓库**
   - 在 GitHub 创建一个新仓库
   - 将当前项目推送到新仓库

2. **在 Render 创建新服务**
   - 登录 Render Dashboard
   - 点击 "New +" → "Web Service"
   - 选择新的 GitHub 仓库
   - Render 会自动检测配置

3. **配置环境变量**
   - 添加必需的环境变量

---

## 🔧 详细操作步骤

### 第一步：准备代码

#### 选项 A：使用部署脚本（最简单）

**Windows 用户：**
```cmd
# 在项目文件夹中运行
deploy.bat
```

**Linux/Mac 用户：**
```bash
chmod +x deploy.sh
./deploy.sh
```

脚本会自动：
- ✅ 检查必需文件
- ✅ 检查敏感文件
- ✅ 提交代码
- ✅ 推送到 GitHub

#### 选项 B：手动操作

```bash
# 1. 检查 Git 状态
git status

# 2. 添加所有文件
git add .

# 3. 提交
git commit -m "Deploy Patent Analysis Workbench to Render"

# 4. 推送到 GitHub
git push origin main
```

---

### 第二步：配置 Render

#### 1. 登录 Render Dashboard

访问：https://dashboard.render.com/

#### 2. 找到你的 Web Service

在 Dashboard 中找到你现有的 Web Service

#### 3. 检查构建配置

进入 "Settings" → "Build & Deploy"，确认：

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`

如果不正确，点击 "Edit" 修改。

#### 4. 配置环境变量（可选）

进入 "Environment" 标签，以下变量通常会自动配置：

**自动配置：**
```
FLASK_SECRET_KEY = <自动生成>
PORT = 10000
```

**可选配置：**
```
MAX_IPS_PER_USER = 5
DATABASE_URL = <PostgreSQL连接字符串>（如果需要数据库）
```

**关于 API Key：**
- ❌ **不需要**在环境变量中配置 `ZHIPUAI_API_KEY`
- ✅ 用户登录后在页面中自行配置自己的 API Key
- ✅ 每个用户可以使用自己的 API Key
```
DATABASE_URL = <PostgreSQL连接字符串>
```

#### 5. 保存并部署

- 点击 "Save Changes"
- Render 会自动开始重新部署
- 或者点击 "Manual Deploy" → "Deploy latest commit"

---

### 第三步：监控部署

#### 查看部署日志

1. 在 Render Dashboard 中打开你的服务
2. 点击 "Logs" 标签
3. 实时查看部署进度

#### 常见日志信息

**成功的部署日志：**
```
==> Building...
Installing dependencies from requirements.txt
...
==> Starting service with 'gunicorn wsgi:app...'
✓ Configuration loaded
✓ Extensions initialized
✓ Database initialized
🚀 Application created successfully!
```

**如果出现错误：**
- 检查环境变量是否正确设置
- 查看具体错误信息
- 参考下面的"常见问题"部分

---

### 第四步：验证部署

#### 1. 访问应用

部署完成后，Render 会提供一个 URL，例如：
```
https://your-app-name.onrender.com
```

#### 2. 测试功能

- ✅ 打开 URL，应该看到登录页面
- ✅ 使用测试账号登录
- ✅ 检查页面样式是否正常
- ✅ 测试文件上传功能
- ✅ 测试 AI 聊天功能

---

## 🔑 获取智谱AI API密钥

如果你还没有智谱AI API密钥：

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 进入控制台
4. 创建 API Key
5. 复制 API Key 并添加到 Render 环境变量

---

## ❓ 常见问题

### 1. 推送代码时提示冲突

**问题：** `git push` 失败，提示有冲突

**解决：**
```bash
# 强制推送（会覆盖远程仓库）
git push origin main -f

# 或者先拉取再合并
git pull origin main --allow-unrelated-histories
git push origin main
```

### 2. Render 构建失败

**问题：** 依赖安装失败

**解决：**
- 检查 `requirements.txt` 是否正确
- 查看 Render 日志中的具体错误
- 确保所有依赖都可以在 Python 3.11 上安装

### 3. 应用启动失败

**问题：** Gunicorn 无法启动

**解决：**
- 检查 Start Command 是否正确
- 确认 `wsgi.py` 文件存在
- 查看 Render 日志了解具体错误

### 4. 登录后显示空白页

**问题：** 登录成功但页面空白

**解决：**
- 检查浏览器控制台是否有 JavaScript 错误
- 确认 `frontend/` 文件夹已推送到 GitHub
- 检查静态文件路径配置

### 5. API 调用失败

**问题：** 聊天功能不工作

**解决：**
- 确认用户已在页面中配置 API Key
- 检查浏览器控制台是否有错误
- 确认 API Key 是否有效（在智谱AI控制台检查）
- 查看 Render 日志中的错误信息

### 6. 数据库连接错误

**问题：** 提示数据库连接失败

**解决：**
- 如果不需要数据库，删除 `DATABASE_URL` 环境变量
- 应用会自动使用文件存储（`users.json`）
- 如果需要数据库，确保 PostgreSQL 服务正常运行

---

## 📊 部署后的配置

### Free 计划限制

Render Free 计划有以下限制：
- ⏰ 15分钟无活动后自动休眠
- 🔄 首次请求需要 30-60 秒唤醒
- 💾 512MB RAM
- 🖥️ 共享 CPU

### 性能优化建议

如果需要更好的性能：
1. 升级到 Starter 计划（$7/月）
2. 使用 PostgreSQL 数据库（持久化数据）
3. 增加 Worker 数量

---

## 🔄 更新应用

以后如果需要更新代码：

```bash
# 1. 修改代码
# 2. 提交更改
git add .
git commit -m "Update: 描述你的更改"

# 3. 推送到 GitHub
git push origin main

# 4. Render 会自动重新部署
```

---

## 📚 相关文档

- **快速部署**: [QUICK_DEPLOY.md](QUICK_DEPLOY.md)
- **完整指南**: [RENDER_DEPLOYMENT_GUIDE.md](RENDER_DEPLOYMENT_GUIDE.md)
- **检查清单**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **配置总结**: [RENDER_DEPLOYMENT_SUMMARY.md](RENDER_DEPLOYMENT_SUMMARY.md)

---

## ✅ 完成！

如果一切顺利，你的专利分析工作台现在应该已经在 Render 上运行了！

访问你的 Render URL 开始使用吧！ 🎉

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Render 日志
2. 参考完整部署指南
3. 检查环境变量配置
4. 联系技术支持

**祝部署顺利！** 🚀
