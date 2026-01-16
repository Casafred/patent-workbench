# 专利分析智能工作台 (ALFRED X IP)

一个集成了专利查询、权利要求处理、AI分析等功能的智能专利分析平台。

## ✨ 功能特性

### 核心功能
- 🔐 **用户认证**: 安全的登录系统，支持IP限制
- 💬 **AI聊天**: 集成智谱AI，支持流式和同步对话
- 📄 **专利查询**: 批量查询Google Patents专利信息
- 📊 **权利要求处理**: 多语言专利权利要求解析和分析
- 📁 **文件管理**: 文件上传、列表、删除等完整功能
- ⚡ **异步批处理**: 支持大规模异步任务处理

### 技术特点
- 🏗️ **模块化架构**: 清晰的分层设计，易于维护和扩展
- 🧪 **完整测试**: 单元测试和属性测试覆盖
- 🌍 **多语言支持**: 支持中文、英文、日文等多种语言
- 🔄 **实时处理**: 支持流式响应和进度反馈

---

## 🚀 快速开始

### 本地开发

#### 1. 安装依赖

```bash
pip install -r requirements.txt
```

#### 2. 配置环境变量

```bash
# 必需
export FLASK_SECRET_KEY="your-secret-key"

# 可选
export DATABASE_URL="postgresql://..."
export MAX_IPS_PER_USER=5
export PORT=5001
```

**注意：** 不需要在环境变量中配置 `ZHIPUAI_API_KEY`，用户登录后在页面中自行配置。

#### 3. 启动应用

```bash
# 开发环境
python backend/app.py

# 生产环境
gunicorn wsgi:app --bind 0.0.0.0:5001 --workers 2
```

#### 4. 访问应用

打开浏览器访问: http://localhost:5001

---

### 部署到 Render

#### 快速部署（3步完成）

1. **推送代码到 GitHub**
   ```bash
   git add .
   git commit -m "Deploy to Render"
   git push origin main
   ```

2. **在 Render 配置环境变量（可选）**
   - `FLASK_SECRET_KEY` - 自动生成
   - 其他变量使用默认值

**注意：** 不需要配置 `ZHIPUAI_API_KEY`，用户登录后在页面中自行配置

3. **等待部署完成**
   - Render 会自动检测配置并部署
   - 通常需要 3-5 分钟

#### 使用部署脚本

**Windows:**
```cmd
deploy.bat
```

**Linux/Mac:**
```bash
chmod +x deploy.sh
./deploy.sh
```

#### 详细部署文档

- 📖 [快速部署指南](QUICK_DEPLOY.md) - 5分钟快速部署
- 📋 [部署检查清单](DEPLOYMENT_CHECKLIST.md) - 确保不遗漏配置
- 📚 [完整部署指南](RENDER_DEPLOYMENT_GUIDE.md) - 详细步骤和问题解决
- ✅ [部署配置总结](RENDER_DEPLOYMENT_SUMMARY.md) - 配置文件说明

---

## 📁 项目结构

```
patent-workbench/
├── backend/                # 后端代码（模块化架构）
│   ├── routes/            # 路由层（6个模块）
│   ├── services/          # 业务逻辑层
│   ├── middleware/        # 中间件层
│   └── utils/             # 工具函数层
├── frontend/              # 前端资源
│   ├── css/              # 样式文件
│   ├── js/               # JavaScript文件
│   └── images/           # 图片资源
├── patent_claims_processor/  # 权利要求处理模块
├── docs/                  # 文档
├── tests/                 # 测试文件
├── tools/                 # 工具脚本
└── test_data/            # 测试数据
```

详细目录结构请查看: [docs/DIRECTORY_STRUCTURE.md](docs/DIRECTORY_STRUCTURE.md)

---

## 📚 文档

### 规格说明（Spec）
- [代码重构规格](.kiro/specs/code-refactoring/) - 完整的规格驱动开发文档
  - [需求文档](.kiro/specs/code-refactoring/requirements.md) - EARS格式的需求规格
  - [设计文档](.kiro/specs/code-refactoring/design.md) - 架构设计和正确性属性
  - [任务清单](.kiro/specs/code-refactoring/tasks.md) - 实施任务和完成状态

### 快速入门
- [重构指南](docs/REFACTORING_README.md) - 了解项目重构
- [快速参考](docs/QUICK_REFERENCE.md) - 常用命令和配置

### API文档
- [权利要求处理API](docs/CLAIMS_PROCESSOR_API.md) - API接口说明
- [测试指南](docs/CLAIMS_PROCESSOR_TEST_GUIDE.md) - 测试方法

### 开发文档
- [重构方案](docs/PROJECT_REFACTORING_PLAN.md) - 完整重构方案
- [重构进度](docs/REFACTORING_PROGRESS.md) - 进度追踪
- [测试结果](docs/REFACTORING_TEST_RESULTS.md) - 测试报告

---

## 🧪 测试

### 运行所有测试

```bash
pytest tests/
```

### 运行特定测试

```bash
# 重构测试
pytest tests/test_refactoring.py -v

# 权利要求API测试
pytest tests/test_claims_api.py -v

# 属性测试
pytest tests/test_excel_processor_properties.py -v
```

### 测试覆盖率

```bash
pytest --cov=backend --cov=patent_claims_processor tests/
```

---

## 🛠️ 开发工具

### 用户管理

```bash
# 创建测试用户
python tools/create_test_user.py

# 生成用户
python tools/generate_user.py
```

### 演示脚本

```bash
# 运行演示
python tools/demo.py

# 导出演示
python tools/demo_export.py

# 恢复演示
python tools/demo_recovery.py
```

---

## 🏗️ 架构设计

### 后端架构（重构后）

```
应用工厂模式
├── 配置层 (config.py)
├── 扩展层 (extensions.py)
├── 服务层 (services/)
├── 中间件层 (middleware/)
├── 工具层 (utils/)
└── 路由层 (routes/)
    ├── 认证路由
    ├── 聊天路由
    ├── 异步批处理路由
    ├── 文件管理路由
    ├── 专利查询路由
    └── 权利要求处理路由
```

### 设计模式
- ✅ 应用工厂模式
- ✅ Blueprint模式
- ✅ 服务层模式
- ✅ 中间件模式
- ✅ 单一职责原则

---

## 📊 重构成果

| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| 单文件行数 | 1456行 | ~250行 | ↓ 83% |
| 模块数量 | 1个文件 | 19个文件 | ↑ 1800% |
| 根目录文件 | 40+个 | 7个 | ↓ 82% |
| 代码可维护性 | 低 | 高 | ✅ |
| 测试覆盖率 | 难以测试 | 可独立测试 | ✅ |

---

## 🔧 技术栈

### 后端
- **Flask 3.x** - Web框架
- **Flask-CORS** - 跨域支持
- **ZhipuAI SDK** - AI对话
- **PostgreSQL** - 数据库
- **psycopg2** - 数据库驱动

### 前端
- **原生JavaScript** - 前端逻辑
- **Marked.js** - Markdown渲染
- **CSS3** - 样式设计

### 测试
- **pytest** - 测试框架
- **hypothesis** - 属性测试

---

## 📝 API端点

### 认证
- `GET /login` - 登录页面
- `POST /login` - 登录处理
- `GET /logout` - 登出

### 聊天
- `POST /api/stream_chat` - 流式聊天
- `POST /api/chat` - 同步聊天

### 专利查询
- `POST /api/patent/search` - 搜索专利
- `POST /api/patent/analyze` - 分析专利

### 权利要求处理
- `POST /api/claims/upload` - 上传文件
- `POST /api/claims/process` - 处理权利要求
- `GET /api/claims/status/<task_id>` - 查询状态
- `POST /api/claims/export/<task_id>` - 导出结果

完整API文档: [docs/CLAIMS_PROCESSOR_API.md](docs/CLAIMS_PROCESSOR_API.md)

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

---

## 📄 许可证

MIT License

---

## 📞 联系方式

- 管理员邮箱: freecasafred@outlook.com
- 项目版本: 2.0（重构完成）
- 最后更新: 2026-01-14

---

## 🎉 致谢

感谢所有为这个项目做出贡献的开发者！

---

**© 2025 ALFRED X IP. All Rights Reserved.**
