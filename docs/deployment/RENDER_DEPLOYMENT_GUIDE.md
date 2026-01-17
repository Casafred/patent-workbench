# Render 部署指南

本指南将帮助你在 Render 上部署 Patent Analysis Workbench 项目。

## 📋 前置准备

1. **Render 账号**：确保你已经有 Render 账号并登录
2. **GitHub 仓库**：项目代码已推送到 GitHub
3. **环境变量**：准备好必要的 API 密钥（如智谱 AI API Key）

## 🚀 部署步骤

### 方法一：使用 render.yaml（推荐）

这是最简单的方法，Render 会自动读取配置文件。

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **在 Render 创建新服务**
   - 登录 [Render Dashboard](https://dashboard.render.com/)
   - 点击 "New +" → "Blueprint"
   - 连接你的 GitHub 仓库
   - Render 会自动检测 `render.yaml` 并创建服务

3. **配置环境变量**（在 Render Dashboard 中）
   - `FLASK_SECRET_KEY`：会自动生成
   - `PORT`：自动设置为 10000
   
   **注意：** 不需要配置 `ZHIPUAI_API_KEY`，用户登录后在页面中自行配置

### 方法二：手动创建 Web Service

如果你想更多控制，可以手动创建：

1. **创建 PostgreSQL 数据库**（可选，如果需要持久化用户数据）
   - 在 Render Dashboard 点击 "New +" → "PostgreSQL"
   - 选择 Free 计划
   - 记下数据库连接信息

2. **创建 Web Service**
   - 点击 "New +" → "Web Service"
   - 连接你的 GitHub 仓库
   - 配置如下：
     - **Name**: `patent-analysis-workbench`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn "backend.app:create_app()" --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
     - **Plan**: 选择 Free 或其他计划

3. **添加环境变量**
   在 "Environment" 标签页添加：
   ```
   FLASK_SECRET_KEY=<自动生成或自定义>
   MAX_IPS_PER_USER=5
   PORT=10000
   ```
   
   **注意：** 不需要配置 `ZHIPUAI_API_KEY`，用户登录后在页面中自行配置

4. **部署**
   - 点击 "Create Web Service"
   - Render 会自动构建和部署

## 🔧 配置说明

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `FLASK_SECRET_KEY` | Flask 会话密钥 | 自动生成 |

**注意：** 不需要配置 `ZHIPUAI_API_KEY`，用户登录后在页面中自行配置

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | 无（使用文件存储） |
| `MAX_IPS_PER_USER` | 每个用户最大 IP 数 | 5 |
| `PORT` | 服务端口 | 10000 |

## 📝 更新现有项目

如果你已经在 Render 上有一个项目，想替换成当前项目：

### 选项 1：更新 GitHub 仓库（推荐）

1. **备份旧代码**（如果需要）
   ```bash
   git checkout -b backup-old-version
   git push origin backup-old-version
   ```

2. **替换代码**
   ```bash
   # 在本地，删除旧文件并复制新文件
   # 或者直接在当前项目文件夹操作
   
   git add .
   git commit -m "Replace with Patent Analysis Workbench"
   git push origin main
   ```

3. **Render 自动重新部署**
   - Render 检测到 GitHub 更新后会自动重新部署
   - 如果没有自动部署，在 Dashboard 点击 "Manual Deploy" → "Deploy latest commit"

### 选项 2：更改仓库连接

1. 在 Render Dashboard 中找到你的服务
2. 进入 "Settings" → "Build & Deploy"
3. 点击 "Disconnect Repository"
4. 重新连接到新的 GitHub 仓库

## 🔍 验证部署

部署完成后，访问 Render 提供的 URL（例如：`https://your-app.onrender.com`）

检查以下功能：
- ✅ 首页加载正常
- ✅ 用户登录/注册功能
- ✅ 文件上传功能
- ✅ API 端点响应正常

## 🐛 常见问题

### 1. 构建失败

**问题**：依赖安装失败
**解决**：检查 `requirements.txt` 是否正确，确保所有依赖都可以安装

### 2. 应用启动失败

**问题**：Gunicorn 无法启动应用
**解决**：
- 检查 Start Command 是否正确
- 查看 Render 日志了解具体错误
- 确保 `backend/app.py` 中的 `create_app()` 函数正常工作

### 3. 静态文件 404

**问题**：CSS/JS 文件无法加载
**解决**：
- 确保 `backend/config.py` 中的 `STATIC_FOLDER` 配置正确
- 检查 HTML 文件中的静态文件路径

### 4. 数据库连接失败

**问题**：无法连接到 PostgreSQL
**解决**：
- 确保 `DATABASE_URL` 环境变量正确设置
- 检查数据库服务是否正常运行
- 如果不需要数据库，可以使用文件存储（删除 `DATABASE_URL` 环境变量）

### 5. API 密钥错误

**问题**：智谱 AI API 调用失败
**解决**：
- 确认用户已在页面中配置 API Key
- 检查 API 密钥是否有效（在智谱AI控制台验证）
- 查看浏览器控制台的错误信息
- 查看 Render 日志了解具体错误信息

## 📊 监控和日志

### 查看日志
1. 在 Render Dashboard 中打开你的服务
2. 点击 "Logs" 标签
3. 实时查看应用日志

### 性能监控
- Render 提供基本的性能指标
- 可以在 "Metrics" 标签查看 CPU、内存使用情况

## 🔄 持续部署

Render 支持自动部署：
- 每次推送到 `main` 分支时自动部署
- 可以在 Settings 中配置自动部署分支
- 支持 Pull Request 预览部署

## 💰 费用说明

### Free 计划限制
- 750 小时/月的运行时间
- 15 分钟无活动后自动休眠
- 首次请求可能需要 30-60 秒唤醒
- 512MB RAM
- 共享 CPU

### 升级建议
如果需要更好的性能，考虑升级到 Starter 或更高计划：
- 无休眠
- 更多资源
- 更快的响应速度

## 📚 相关资源

- [Render 官方文档](https://render.com/docs)
- [Flask 部署指南](https://flask.palletsprojects.com/en/latest/deploying/)
- [Gunicorn 文档](https://docs.gunicorn.org/)

## 🆘 获取帮助

如果遇到问题：
1. 查看 Render 日志
2. 检查本地是否能正常运行
3. 参考 Render 官方文档
4. 联系 Render 支持团队

---

**祝部署顺利！** 🎉
