# 🚀 部署到GitHub + Render完整指南

## 📋 前置准备

### 1. 注册账户
- [GitHub账户](https://github.com/signup)
- [Render账户](https://render.com)

### 2. 安装必要工具
- Git (Windows: [Git下载](https://git-scm.com/download/win))
- 文本编辑器 (推荐VS Code)

## 🔧 第一步：上传到GitHub

### 方法A：使用Git命令行（推荐）

1. **初始化Git仓库**
```bash
cd "c:\Users\sdh777\Desktop\智能请求体前后端测试\patent-workbench - 副本 - 副本 - 副本 - 副本 - 副本"
git init
git add .
git commit -m "Initial commit: AI patent workbench with user authentication"
```

2. **创建GitHub仓库**
- 登录GitHub.com
- 点击右上角 "+" → "New repository"
- 命名仓库（如：ai-patent-workbench）
- 选择 "Public" 或 "Private"
- 不要勾选 "Initialize with README"
- 点击 "Create repository"

3. **连接并推送**
```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-patent-workbench.git
git branch -M main
git push -u origin main
```

### 方法B：使用GitHub Desktop（图形界面）
1. 下载 [GitHub Desktop](https://desktop.github.com/)
2. 点击 "File" → "Add Local Repository"
3. 选择项目文件夹
4. 填写提交信息，点击 "Publish repository"

## 🚀 第二步：部署到Render

### 1. 创建Render服务

1. 登录 [Render.com](https://render.com)
2. 点击 "New" → "Web Service"
3. 连接GitHub账户（如果还没连接）
4. 选择刚才创建的仓库

### 2. 配置服务设置

**基本设置：**
- **Name**: ai-patent-workbench
- **Environment**: Python
- **Region**: Singapore (或离你最近的)

**构建命令：**
```bash
pip install -r requirements.txt
```

**启动命令：**
```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

### 3. 设置环境变量

在Render控制台，进入你的服务 → "Environment" → "Environment Variables"

**必须设置：**
```
SECRET_KEY=生成一个随机字符串（至少32位）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=你的管理员密码
RENDER=true
FLASK_ENV=production
```

**生成SECRET_KEY的方法：**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. 部署

点击 "Create Web Service"，Render会自动部署

## ⚙️ 第三步：验证部署

### 1. 访问应用
部署完成后，Render会提供一个类似 `https://ai-patent-workbench.onrender.com` 的URL

### 2. 首次设置
1. 访问 `/login`
2. 使用管理员账户登录（用户名密码就是你设置的ADMIN_USERNAME/ADMIN_PASSWORD）
3. 访问 `/admin` 创建用户

## 📝 重要文件检查清单

上传到GitHub前，确保以下文件已存在：

```
✅ app.py              # 主应用文件
✅ requirements.txt     # 依赖列表
✅ auth.py             # 认证模块
✅ config.py           # 配置文件
✅ login.html          # 登录页面
✅ admin.html          # 管理后台
✅ index.html          # 主页面
✅ .env.example        # 环境变量示例
✅ README.md           # 项目说明
✅ DEPLOYMENT_GUIDE.md  # 本部署指南
✅ create_users.py     # 用户创建脚本
✅ users_example.txt   # 用户列表示例
```

## 🔧 故障排除

### 常见问题1：部署失败
**错误信息：** `ModuleNotFoundError: No module named '...'`
**解决：** 检查requirements.txt是否包含所有依赖

### 常见问题2：数据库权限错误
**错误信息：** `sqlite3.OperationalError: unable to open database file`
**解决：** Render会自动使用 `/tmp/users.db`，确保 `RENDER=true` 已设置

### 常见问题3：静态文件404
**错误信息：** 页面样式丢失
**解决：** 确保所有HTML、CSS、JS文件已上传

## 🔄 后续更新

### 更新代码
1. 本地修改代码
2. 提交到GitHub：
```bash
git add .
git commit -m "Update features"
git push origin main
```
3. Render会自动重新部署（约1-2分钟）

### 添加新用户
方法1：通过Web界面 `/admin`  
方法2：使用脚本 `python create_users.py --file users.txt`

## 📞 支持

- **GitHub Issues**: 在你的仓库创建Issue
- **Render文档**: [docs.render.com](https://docs.render.com)
- **Git帮助**: [docs.github.com](https://docs.github.com)