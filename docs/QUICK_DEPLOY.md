# 快速部署到 Render

## 🚀 5分钟部署步骤

### 1. 准备 GitHub 仓库

如果你已经有一个 Render 项目连接到 GitHub，只需要替换代码：

```bash
# 在你的项目文件夹中
git add .
git commit -m "Deploy Patent Analysis Workbench to Render"
git push origin main
```

### 2. 配置环境变量（可选）

在 Render Dashboard 中，进入你的 Web Service，以下环境变量通常会自动配置：

**自动配置的环境变量：**
- `FLASK_SECRET_KEY` = 自动生成
- `PORT` = 10000

**可选的环境变量：**
- `MAX_IPS_PER_USER` = 5
- `DATABASE_URL` = PostgreSQL连接字符串（如果需要数据库）

**关于 API Key：**
- ❌ **不需要**在环境变量中配置 `ZHIPUAI_API_KEY`
- ✅ 用户登录后在页面中自行配置自己的 API Key
- ✅ 每个用户可以使用自己的 API Key

### 3. 部署设置

确保你的 Render 服务配置如下：

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
- **Environment**: Python 3

### 4. 触发部署

保存配置后，Render 会自动开始部署。你可以在 "Logs" 标签查看部署进度。

## ✅ 验证部署

部署完成后，访问你的 Render URL（例如：`https://your-app.onrender.com`）

你应该看到登录页面。使用 `users.json` 中的账号登录。

## 🔑 获取智谱AI API密钥

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册/登录账号
3. 在控制台创建 API Key
4. 将 API Key 添加到 Render 环境变量

## 📁 项目文件说明

部署相关的关键文件：

- `wsgi.py` - Gunicorn 入口点
- `Procfile` - Render 启动命令
- `render.yaml` - Render 自动配置（可选）
- `requirements.txt` - Python 依赖
- `runtime.txt` - Python 版本
- `.gitignore` - Git 忽略文件

## 🐛 常见问题

### 应用无法启动

检查 Render 日志，常见原因：
- Python 依赖安装失败
- 端口配置错误
- 启动命令不正确

### 静态文件404

确保：
- `frontend/` 文件夹已推送到 GitHub
- `backend/config.py` 中的 `STATIC_FOLDER` 配置正确

### 数据库连接失败

如果不需要数据库功能：
- 不要设置 `DATABASE_URL` 环境变量
- 应用会自动使用文件存储（`users.json`）

## 📞 需要帮助？

查看完整部署指南：`RENDER_DEPLOYMENT_GUIDE.md`
