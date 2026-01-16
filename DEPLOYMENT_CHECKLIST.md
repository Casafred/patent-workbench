# 部署前检查清单 ✓

在推送代码到 GitHub 并部署到 Render 之前，请确保完成以下检查：

## 📋 代码准备

- [x] `wsgi.py` - Gunicorn 入口文件已创建
- [x] `Procfile` - 启动命令已配置
- [x] `render.yaml` - Render 配置文件已创建（可选）
- [x] `requirements.txt` - 所有依赖已列出
- [x] `runtime.txt` - Python 版本已指定
- [x] `.gitignore` - 敏感文件已排除

## 🔐 安全检查

- [ ] `users.json` 已添加到 `.gitignore`（避免泄露用户密码）
- [ ] 环境变量使用 `os.environ.get()` 而不是硬编码
- [ ] `FLASK_SECRET_KEY` 将在 Render 中设置
- [ ] API 密钥不在代码中硬编码

## 📁 文件结构检查

确保以下文件夹和文件存在：

```
项目根目录/
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── extensions.py
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── utils/
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/
├── patent_claims_processor/
├── wsgi.py
├── Procfile
├── requirements.txt
├── runtime.txt
└── .gitignore
```

## 🔧 配置检查

### backend/config.py

- [ ] `HOST = '0.0.0.0'` - 允许外部访问
- [ ] `PORT = int(os.environ.get('PORT', 5001))` - 使用环境变量
- [ ] `DEBUG = False` - 生产环境关闭调试
- [ ] `SECRET_KEY` 从环境变量读取

### requirements.txt

确保包含所有必需的依赖：
- [ ] Flask
- [ ] gunicorn
- [ ] zhipuai
- [ ] flask-cors
- [ ] werkzeug
- [ ] psycopg2-binary（如果使用数据库）
- [ ] 其他项目依赖

## 🌐 Render 配置准备

### 环境变量清单

准备好以下环境变量的值：

**可选：**
- [ ] `FLASK_SECRET_KEY` - Flask会话密钥（自动生成）
- [ ] `MAX_IPS_PER_USER` - 每用户最大IP数（默认5）
- [ ] `DATABASE_URL` - PostgreSQL连接字符串（如需数据库）

**关于 API Key：**
- [ ] 理解：不需要在环境变量中配置 `ZHIPUAI_API_KEY`
- [ ] 用户登录后在页面中自行配置自己的 API Key

### Render 服务设置

- [ ] Build Command: `pip install -r requirements.txt`
- [ ] Start Command: `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
- [ ] Environment: Python 3
- [ ] Plan: Free 或其他

## 📤 Git 准备

### 提交前检查

```bash
# 检查 Git 状态
git status

# 确保没有敏感文件被追踪
git ls-files | grep -E "(users.json|\.env|\.sqlite)"

# 如果有敏感文件，移除追踪
git rm --cached users.json
```

### 推送到 GitHub

```bash
# 添加所有文件
git add .

# 提交
git commit -m "Prepare for Render deployment"

# 推送到主分支
git push origin main
```

## 🧪 本地测试

在部署前，建议在本地测试：

```bash
# 安装依赖
pip install -r requirements.txt

# 设置环境变量（Windows CMD）
set FLASK_SECRET_KEY=test-secret-key
set PORT=5001

# 使用 Gunicorn 测试（类似生产环境）
gunicorn wsgi:app --bind 0.0.0.0:5001 --workers 2

# 访问 http://localhost:5001 测试
```

## ✅ 部署后验证

部署完成后，检查以下功能：

- [ ] 首页可以访问
- [ ] 登录功能正常
- [ ] 静态文件（CSS/JS）加载正常
- [ ] API 端点响应正常
- [ ] 文件上传功能正常
- [ ] 智谱AI API 调用正常

## 📊 监控设置

- [ ] 在 Render Dashboard 查看日志
- [ ] 设置错误通知（如果需要）
- [ ] 监控应用性能指标

## 🔄 回滚计划

如果部署出现问题：

1. 在 Render Dashboard 点击 "Rollback"
2. 或者在 Git 中回滚：
   ```bash
   git revert HEAD
   git push origin main
   ```

## 📝 文档更新

- [ ] 更新 README.md 添加部署说明
- [ ] 记录 Render URL
- [ ] 更新团队文档

---

## 🎯 快速检查命令

运行以下命令快速检查关键文件：

```bash
# 检查关键文件是否存在
ls wsgi.py Procfile requirements.txt runtime.txt .gitignore

# 检查 Python 语法
python -m py_compile wsgi.py backend/app.py

# 检查依赖是否可安装
pip install -r requirements.txt --dry-run

# 检查 Git 忽略配置
git check-ignore users.json .env
```

---

**准备好了吗？** 如果所有检查项都完成，你可以开始部署了！ 🚀

参考：
- 快速部署指南：`QUICK_DEPLOY.md`
- 完整部署指南：`RENDER_DEPLOYMENT_GUIDE.md`
