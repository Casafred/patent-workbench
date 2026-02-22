# 专利分析智能工作台 (ALFRED X IP)

一个集成了专利查询、权利要求处理、AI分析、PDF阅读与OCR解析等功能的智能专利分析平台。

## ✨ 功能特性

### 核心功能
- 🔐 **用户认证**: 安全的登录系统，支持IP限制
- 💬 **即时对话**: 专利领域专属AI对话系统，支持多模态交互和联网搜索
- 📄 **专利查询**: 批量查询Google Patents专利信息，支持缓存机制
- 📊 **权利要求处理**: 多语言专利权利要求解析和分析
- 📁 **文件管理**: 文件上传、列表、删除等完整功能
- ⚡ **异步批处理**: 支持大规模异步任务处理
- 📖 **PDF阅读与OCR**: 支持PDF/图片上传、OCR智能解析、划词交互

### 功能亮点
- 🔄 **批量专利解读**: 支持最多50个专利号同时处理，自动获取专利信息并AI智能解读
- 🎯 **权利要求对比**: 2-4个权利要求多维度对比，自动识别引用关系
- 🏷️ **智能缓存**: 专利数据本地缓存，避免重复爬取
- 📋 **全局智能剪贴板**: 跨功能数据共享，一键复制粘贴
- 🎨 **交互式标注**: PDF划词选中、悬浮工具栏、AI对话窗口
- 👤 **游客模式**: 无需注册即可体验核心功能，有限制使用

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
scripts\deploy.bat
```

**Linux/Mac:**
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### 详细部署文档

- 📖 [快速部署指南](QUICK_DEPLOY.md) - 5分钟快速部署
- 📋 [部署检查清单](DEPLOYMENT_CHECKLIST.md) - 确保不遗漏配置
- 📚 [完整部署指南](RENDER_DEPLOYMENT_GUIDE.md) - 详细步骤和问题解决
- ✅ [部署配置总结](RENDER_DEPLOYMENT_SUMMARY.md) - 配置文件说明

---

## 🚀 应用入口

### 生产环境
```bash
# 使用 wsgi.py (推荐)
gunicorn wsgi:app --bind 0.0.0.0:5001 --workers 2
```

### 开发环境
```bash
# 使用重构后的应用 (推荐)
python app_new.py

# 或使用原始应用 (备份)
python app.py
```

### 模块化结构
```
backend/app.py          # 主应用文件 (应用工厂模式)
app_new.py             # 开发测试入口
app.py                 # 原始应用备份
wsgi.py                # 生产部署入口
```

---

## 📁 项目结构

```
patent-workbench/
├── backend/                # 后端代码（模块化架构）✅
│   ├── routes/            # 路由层（6个模块）
│   ├── services/          # 业务逻辑层
│   ├── middleware/        # 中间件层
│   ├── user_management/   # 用户管理模块
│   └── utils/             # 工具函数层
├── frontend/              # 前端资源
│   ├── components/        # HTML组件（重构后）✅
│   │   ├── header.html
│   │   ├── tab-navigation.html
│   │   └── tabs/          # 9个功能标签页
│   ├── css/               # 样式文件（已模块化）✅
│   │   ├── base/          # 基础样式
│   │   ├── components/    # 组件样式
│   │   ├── layout/        # 布局样式
│   │   └── pages/         # 页面样式
│   ├── js/                # 旧版JavaScript文件
│   └── images/            # 图片资源
├── js/                    # JavaScript模块（重构中 40%）⚠️
│   ├── core/              # 核心工具 ✅
│   │   ├── api.js
│   │   └── component-loader.js
│   ├── modules/           # 功能模块
│   │   ├── chat/          # 聊天模块（7个文件）✅
│   │   ├── claims/        # 权利要求模块（6个文件）✅
│   │   ├── init/          # 初始化模块（5个文件）✅
│   │   ├── pdf-ocr/       # PDF/OCR模块（5个文件）✅
│   │   └── navigation/    # 导航模块 ✅
│   ├── main/              # 主模块（导出等辅助功能）
│   ├── main.js            # 主入口（已优化）⚠️
│   └── [待重构文件]       # 6个大文件待拆分 ❌
├── patent_claims_processor/  # 权利要求处理模块
├── docs/                  # 文档
├── tests/                 # 测试文件
├── scripts/               # 部署和管理脚本
├── tools/                 # 开发工具和辅助脚本
├── config/                # 配置文件
├── .kiro/                 # 规格文档和Steering规则
│   ├── specs/             # 功能规格
│   │   ├── html-js-refactoring/  # HTML/JS重构规格
│   │   ├── code-refactoring/     # 后端重构规格
│   │   └── ...
│   └── steering/          # 全局规则
│       ├── project-organization-standards.md
│       └── project-architecture.md
├── README.md              # 项目说明
├── app.py                 # 原始应用备份
├── app_new.py             # 开发测试入口
└── wsgi.py                # 生产部署入口
```

**详细目录结构请查看:** [docs/DIRECTORY_STRUCTURE.md](docs/DIRECTORY_STRUCTURE.md)

**重构进度详情请查看:** [.kiro/specs/html-js-refactoring/REFACTORING_STATUS_20260207.md](.kiro/specs/html-js-refactoring/REFACTORING_STATUS_20260207.md)

---

## 📚 文档

### 规格说明（Spec）
- [HTML/JS重构规格](.kiro/specs/html-js-refactoring/) - 前端重构文档（进行中）
  - [需求文档](.kiro/specs/html-js-refactoring/requirements.md) - EARS格式的需求规格
  - [设计文档](.kiro/specs/html-js-refactoring/design.md) - 架构设计和正确性属性
  - [任务清单](.kiro/specs/html-js-refactoring/tasks.md) - 实施任务和完成状态
  - [重构进度](.kiro/specs/html-js-refactoring/REFACTORING_STATUS_20260207.md) - 详细进度报告
  - [大文件拆分计划](.kiro/specs/html-js-refactoring/LARGE_FILES_REFACTORING_PLAN.md) - 拆分方案
- [代码重构规格](.kiro/specs/code-refactoring/) - 后端重构文档（已完成）
  - [需求文档](.kiro/specs/code-refactoring/requirements.md) - EARS格式的需求规格
  - [设计文档](.kiro/specs/code-refactoring/design.md) - 架构设计和正确性属性
  - [任务清单](.kiro/specs/code-refactoring/tasks.md) - 实施任务和完成状态

### Steering规则
- [项目组织规范](.kiro/steering/project-organization-standards.md) - 文件组织和代码质量标准
- [项目架构规范](.kiro/steering/project-architecture.md) - 架构文档提醒和工作流程

### 快速入门
- [重构指南](docs/REFACTORING_README.md) - 了解项目重构
- [快速参考](docs/QUICK_REFERENCE.md) - 常用命令和配置
- [目录结构](docs/DIRECTORY_STRUCTURE.md) - 详细的目录结构说明

### API文档
- [权利要求处理API](docs/CLAIMS_PROCESSOR_API.md) - API接口说明
- [测试指南](docs/CLAIMS_PROCESSOR_TEST_GUIDE.md) - 测试方法

### 开发文档
- [重构方案](docs/PROJECT_REFACTORING_PLAN.md) - 完整重构方案
- [重构进度](docs/REFACTORING_PROGRESS.md) - 进度追踪
- [测试结果](docs/REFACTORING_TEST_RESULTS.md) - 测试报告

---

## 🧪 测试

### 游客模式

游客模式允许用户无需注册即可体验核心功能。

**进入方式**: 在登录页面点击"游客模式"按钮

**功能限制**:

| 功能 | 正常用户 | 游客模式 |
|------|---------|---------|
| AI模型选择 | 全部模型 | 仅 glm-4-flash |
| 功能一 - 上传文件 | ✅ | ❌ 禁用 |
| 功能一 - 联网搜索 | ✅ | ❌ 禁用 |
| 功能五 - 批量专利检索 | 50篇/次 | 5篇/小时 |
| 功能八 - 图片上传 | 无限制 | 1张/小时 |
| 功能八 - PDF解析 | 全部/范围/当前页 | 仅当前页，1页/小时 |
| 数据缓存 | 持久保存 | 不保存，关闭清空 |
| 修改密码/用户名 | ✅ | ❌ 隐藏 |
| 数据导出 | ✅ | ❌ 隐藏 |

**配置游客模式**:

1. 复制配置模板:
   ```bash
   cp config/guest_config.json.example config/guest_config.json
   ```

2. 编辑 `config/guest_config.json`，填入智谱AI API Key:
   ```json
   {
       "guest_api_key": "您的智谱AI_API_KEY",
       "guest_model": "glm-4-flash",
       "guest_session_lifetime_hours": 2
   }
   ```

**注意**: `guest_config.json` 已加入 `.gitignore`，不会被提交到Git。

---

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

### 后端重构（已完成）✅

| 指标 | 重构前 | 重构后 | 改进 |
|------|--------|--------|------|
| 单文件行数 | 1456行 | ~250行 | ↓ 83% |
| 模块数量 | 1个文件 | 19个文件 | ↑ 1800% |
| 根目录文件 | 40+个 | 7个 | ↓ 82% |
| 代码可维护性 | 低 | 高 | ✅ |
| 测试覆盖率 | 难以测试 | 可独立测试 | ✅ |

### 前端重构（进行中 50%）⚠️

| 阶段 | 状态 | 进度 | 说明 |
|------|------|------|------|
| **基础设施** | ✅ 完成 | 100% | 组件加载系统、目录结构 |
| **HTML组件化** | ✅ 完成 | 100% | 9个功能标签页全部提取 |
| **chat.js拆分** | ✅ 完成 | 100% | 拆分为7个模块 |
| **claims拆分** | ✅ 完成 | 100% | 拆分为6个模块 |
| **pdf-ocr模块** | ✅ 完成 | 100% | 拆分为5个模块 |
| **main.js重构** | ✅ 完成 | 100% | 初始化逻辑模块化 |
| **其他大文件** | ❌ 未开始 | 0% | 6个文件待拆分 |
| **文档和测试** | ⚠️ 部分完成 | 20% | 缺少属性测试 |

**已完成：**
- ✅ index.html: 1873行 → ~200行（减少89%）
- ✅ chat.js: 2243行 → 7个模块
- ✅ claimsProcessorIntegrated.js: 3563行 → 6个模块
- ✅ pdf-ocr模块: 5个独立模块
- ✅ main.js: 1771行 → ~400行（减少77%）
- ✅ 9个HTML组件提取完成

**待完成（P0优先级）：**
- ❌ largeBatch.js (1153行) - 最高优先级
- ❌ 其他6个大文件（约6000行）- 高优先级
- ⚠️ main.js进一步优化（目标<300行）

**详细进度：** [.kiro/specs/html-js-refactoring/REFACTORING_STATUS_20260207.md](.kiro/specs/html-js-refactoring/REFACTORING_STATUS_20260207.md)

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
- 项目版本: 2.6（功能九PDF阅读与OCR已上线）
- 最后更新: 2026-02-18

---

## 📁 项目整理说明

### 整理内容
- **创建了新目录**: `scripts/`（部署脚本）和 `tools/`（开发工具）
- **识别了冗余文件**: 根目录 `js/` 和 `css/` 目录中的文件与 `frontend/` 目录重复
- **优化了文档结构**: 更新了 README.md 以反映当前项目状态

### 已完成工作
- 移动部署脚本到 `scripts/` 目录 ✓
- 移动根目录测试文件到 `tests/` 目录 ✓
- 删除冗余的前端文件（js/目录）✓
- 清理冗余的 CSS 备份文件（css/目录）✓

---

## 🎉 致谢

感谢所有为这个项目做出贡献的开发者！

---

**© 2025 ALFRED X IP. All Rights Reserved.**
