# 项目目录结构

## 📁 根目录

```
patent-workbench/
├── app.py                      # 原始应用入口（保留备份）
├── app_new.py                  # 重构后的应用入口
├── requirements.txt            # Python依赖
├── setup.py                    # 安装配置
├── pytest.ini                  # 测试配置
├── users.json                  # 用户数据
├── README.md                   # 项目说明
│
├── backend/                    # 后端代码（重构后）
│   ├── app.py                  # 主应用（应用工厂）
│   ├── config.py               # 配置管理
│   ├── extensions.py           # Flask扩展初始化
│   ├── middleware/             # 中间件
│   │   └── auth_middleware.py
│   ├── services/               # 业务逻辑服务
│   │   ├── auth_service.py
│   │   └── api_service.py
│   ├── utils/                  # 工具函数
│   │   ├── response.py
│   │   └── validators.py
│   └── routes/                 # 路由模块
│       ├── auth.py             # 认证路由
│       ├── chat.py             # 聊天路由
│       ├── async_batch.py      # 异步批处理路由
│       ├── files.py            # 文件管理路由
│       ├── patent.py           # 专利查询路由
│       └── claims.py           # 权利要求处理路由
│
├── frontend/                   # 前端资源
│   ├── index.html              # 主页面
│   ├── help.html               # 帮助页面
│   ├── claims_processor.html  # 权利要求处理页面
│   ├── css/                    # 样式文件
│   │   └── main.css
│   ├── js/                     # JavaScript文件
│   │   └── marked.min.js
│   ├── images/                 # 图片资源
│   │   └── ALFRED X IP LOGO.webp
│   └── templates/              # 模板文件（预留）
│
├── patent_claims_processor/    # 权利要求处理模块
│   ├── processors/             # 处理器
│   ├── services/               # 服务
│   └── models/                 # 数据模型
│
├── docs/                       # 文档
│   ├── PROJECT_REFACTORING_PLAN.md         # 重构方案
│   ├── REFACTORING_PROGRESS.md             # 重构进度
│   ├── REFACTORING_COMPLETE_SUMMARY.md     # 完成总结
│   ├── REFACTORING_TEST_RESULTS.md         # 测试结果
│   ├── REFACTORING_README.md               # 重构指南
│   ├── QUICK_REFERENCE.md                  # 快速参考
│   ├── CLAIMS_PROCESSOR_API.md             # API文档
│   ├── CLAIMS_PROCESSOR_TEST_GUIDE.md      # 测试指南
│   ├── MANUAL_TEST_GUIDE.md                # 手动测试指南
│   ├── INTEGRATION_TEST_STEPS.md           # 集成测试步骤
│   ├── RECOVERY_FEATURE.md                 # 恢复功能文档
│   └── ...                                 # 其他文档
│
├── tests/                      # 测试文件
│   ├── test_refactoring.py     # 重构测试
│   ├── test_claims_api.py      # 权利要求API测试
│   ├── test_flask_integration.py   # Flask集成测试
│   ├── test_patent_scraper.py  # 专利爬虫测试
│   └── ...                     # 其他测试
│
├── tools/                      # 工具脚本
│   ├── create_test_user.py     # 创建测试用户
│   ├── generate_user.py        # 生成用户
│   ├── demo.py                 # 演示脚本
│   ├── demo_export.py          # 导出演示
│   ├── demo_recovery.py        # 恢复演示
│   └── debug_export.py         # 调试导出
│
├── test_data/                  # 测试数据
│   ├── test.xlsx
│   └── test_smartphone.xlsx
│
├── uploads/                    # 上传文件目录
├── output/                     # 输出文件目录
├── config/                     # 配置文件（预留）
│
└── .kiro/                      # Kiro配置
    └── specs/                  # 规格文档
        └── code-refactoring/
```

---

## 📂 目录说明

### 核心目录

#### `backend/` - 后端代码
重构后的后端代码，采用模块化架构：
- **app.py**: 应用工厂，创建Flask应用
- **config.py**: 集中配置管理
- **extensions.py**: Flask扩展初始化
- **middleware/**: 中间件层（认证等）
- **services/**: 业务逻辑层
- **utils/**: 工具函数层
- **routes/**: 路由层（6个模块）

#### `frontend/` - 前端资源
所有前端相关文件：
- **HTML文件**: 页面模板
- **css/**: 样式文件
- **js/**: JavaScript文件
- **images/**: 图片资源

#### `patent_claims_processor/` - 权利要求处理
专利权利要求处理的核心模块：
- 多语言支持（中文、英文、日文等）
- Excel文件处理
- 权利要求解析和提取

### 辅助目录

#### `docs/` - 文档
所有项目文档：
- 重构相关文档
- API文档
- 测试指南
- 功能说明

#### `tests/` - 测试
所有测试文件：
- 单元测试
- 集成测试
- API测试
- 属性测试（Property-Based Testing）

#### `tools/` - 工具脚本
开发和维护工具：
- 用户管理脚本
- 演示脚本
- 调试工具

#### `test_data/` - 测试数据
测试用的数据文件

#### `uploads/` - 上传目录
用户上传的文件存储位置

#### `output/` - 输出目录
系统生成的输出文件

---

## 🎯 重构成果

### 代码组织改进

| 方面 | 重构前 | 重构后 |
|------|--------|--------|
| 单文件行数 | 1456行 | ~250行 |
| 模块数量 | 1个文件 | 19个文件 |
| 目录结构 | 混乱 | 清晰分层 |
| 可维护性 | 低 | 高 |

### 目录整理成果

- ✅ 根目录清理：从40+个文件 → 7个核心文件
- ✅ 文档集中：18个文档文件移至 `docs/`
- ✅ 测试集中：5个测试文件移至 `tests/`
- ✅ 工具集中：6个工具脚本移至 `tools/`
- ✅ 前端资源：5个前端文件移至 `frontend/`

---

## 📝 快速导航

### 开发相关
- 启动应用: `python app_new.py`
- 运行测试: `pytest tests/`
- 查看配置: `backend/config.py`

### 文档相关
- 重构指南: `docs/REFACTORING_README.md`
- API文档: `docs/CLAIMS_PROCESSOR_API.md`
- 快速参考: `docs/QUICK_REFERENCE.md`

### 工具相关
- 创建用户: `python tools/create_test_user.py`
- 运行演示: `python tools/demo.py`

---

**最后更新**: 2026-01-14  
**版本**: 2.0（重构完成）
