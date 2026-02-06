---
inclusion: always
priority: high
---

# 项目组织和代码质量标准

## 📋 概述

本文档定义了项目的全局组织标准和代码质量要求。所有开发工作都必须遵守这些规则。

## 🗂️ 文件组织规则

### 1. 禁止在根目录堆积文件

**规则：** 所有文件必须放在对应的分类目录中，根目录只保留必要的配置文件。

**允许在根目录的文件：**
- `README.md` - 项目说明
- `package.json` / `requirements.txt` - 依赖配置
- `.gitignore` - Git配置
- `app.py` / `run_app.py` - 主入口文件
- 其他必要的配置文件（如 `gunicorn_config.py`, `pytest.ini` 等）

**必须分类存放的文件：**

#### 文档文件 → `docs/`
- ✅ 所有 `.md` 文档文件
- ✅ 使用指南、部署文档
- ✅ 修复记录、功能说明
- ✅ 子目录分类：
  - `docs/features/` - 功能文档
  - `docs/fixes/` - 修复记录
  - `docs/deployment/` - 部署文档
  - `docs/guides/` - 使用指南
  - `docs/cleanup/` - 清理记录

#### 测试文件 → `tests/`
- ✅ 所有 `test_*.py` 文件
- ✅ 所有 `test_*.js` 文件
- ✅ 测试HTML文件 → `tests/tests_html/`
- ✅ 测试数据文件 → `tests/test_data/`
- ✅ 诊断脚本 → `tests/`

#### 工具脚本 → `scripts/` 或 `tools/`
- ✅ 部署脚本 → `scripts/`
- ✅ 测试工具 → `tools/`
- ✅ 诊断工具 → `tools/`
- ✅ 构建脚本 → `scripts/`

#### 临时文件 → `temp/` 或删除
- ✅ 备份文件（`.backup`）
- ✅ 临时测试文件
- ✅ 旧版本文件（`_old`, `_v1` 等）

**❌ 错误示例：**
```
项目根目录/
├── test_something.py          # ❌ 应该在 tests/
├── 功能说明.md                 # ❌ 应该在 docs/features/
├── deploy_script.sh           # ❌ 应该在 scripts/
├── temp_file.js               # ❌ 应该删除或移到 temp/
└── old_version.py.backup      # ❌ 应该删除或移到备份目录
```

**✅ 正确示例：**
```
项目根目录/
├── README.md
├── app.py
├── requirements.txt
├── docs/
│   ├── features/功能说明.md
│   └── fixes/修复记录.md
├── tests/
│   ├── test_something.py
│   └── tests_html/
├── scripts/
│   └── deploy_script.sh
└── tools/
    └── diagnostic_tool.py
```

## 📦 代码模块化规则

### 2. 文件大小和复杂度限制

**规则：** 当文件变得过大或过于复杂时，必须拆分成多个模块。

**限制标准：**
- **JavaScript/Python文件：** 不超过 500 行
- **HTML文件：** 不超过 1000 行
- **CSS文件：** 不超过 500 行
- **单个函数：** 不超过 50 行
- **单个类：** 不超过 300 行

**触发拆分的信号：**
1. 文件行数超过限制
2. 文件包含多个不相关的功能
3. 难以快速理解文件的主要职责
4. 修改一个功能会影响其他不相关功能
5. 测试文件变得难以维护

### 3. 模块拆分策略

**原则：单一职责原则（Single Responsibility Principle）**

每个模块应该只负责一个明确的功能领域。

**拆分方法：**

#### 方法A：按功能拆分
```javascript
// ❌ 错误：所有功能都在一个文件
main.js (2000行)
  - API调用
  - 用户认证
  - 数据处理
  - UI更新
  - 事件处理

// ✅ 正确：按功能拆分
js/core/
  ├── api.js           (200行) - API调用
  ├── auth.js          (150行) - 用户认证
  └── events.js        (180行) - 事件处理
js/modules/
  ├── data-processor.js (250行) - 数据处理
  └── ui-updater.js     (220行) - UI更新
```

#### 方法B：按层次拆分
```python
# ❌ 错误：所有逻辑都在一个文件
app.py (3000行)
  - 路由定义
  - 业务逻辑
  - 数据库操作
  - 工具函数

# ✅ 正确：按层次拆分
backend/
  ├── routes/          - 路由层
  │   ├── auth.py
  │   └── api.py
  ├── services/        - 业务逻辑层
  │   ├── user_service.py
  │   └── data_service.py
  ├── models/          - 数据模型层
  │   └── user.py
  └── utils/           - 工具函数层
      └── helpers.py
```

#### 方法C：按组件拆分（前端）
```html
<!-- ❌ 错误：所有HTML都在一个文件 -->
index.html (3000行)
  - 头部
  - 导航
  - 8个功能标签页
  - 底部

<!-- ✅ 正确：按组件拆分 -->
frontend/
  ├── index.html (200行) - 主框架
  └── components/
      ├── header.html
      ├── navigation.html
      └── tabs/
          ├── feature1.html
          ├── feature2.html
          └── ...
```

### 4. 新增功能的处理原则

**规则：** 在添加新功能前，必须评估现有文件的复杂度。

**决策流程：**

```
新功能需求
    ↓
评估现有文件
    ↓
文件 < 400行 且功能相关？
    ↓ 是                    ↓ 否
添加到现有文件          创建新模块
    ↓                        ↓
添加后 < 500行？        按功能分类放置
    ↓ 是      ↓ 否
    完成      重构拆分
```

**评估清单：**
- [ ] 现有文件行数是否 < 400行？
- [ ] 新功能是否与现有代码高度相关？
- [ ] 添加后文件是否仍然易于理解？
- [ ] 是否会增加文件的职责数量？
- [ ] 测试是否仍然容易编写？

**如果任何一项答案是"否"，应该创建新模块。**

## 🏗️ 目录结构标准

### 标准项目结构

```
项目根目录/
├── .kiro/                    # Kiro配置
│   ├── specs/               # 功能规范
│   └── steering/            # 全局规则
├── backend/                 # 后端代码
│   ├── routes/             # 路由（每个文件 < 300行）
│   ├── services/           # 业务逻辑（每个文件 < 500行）
│   ├── models/             # 数据模型
│   ├── utils/              # 工具函数
│   └── middleware/         # 中间件
├── frontend/                # 前端代码
│   ├── components/         # HTML组件
│   ├── css/               # 样式文件
│   │   ├── base/          # 基础样式
│   │   ├── components/    # 组件样式
│   │   ├── layout/        # 布局样式
│   │   └── pages/         # 页面样式
│   └── js/                # JavaScript（旧版）
├── js/                      # JavaScript模块（新版）
│   ├── core/              # 核心模块
│   └── modules/           # 功能模块
├── docs/                    # 文档
│   ├── features/          # 功能文档
│   ├── fixes/             # 修复记录
│   ├── deployment/        # 部署文档
│   ├── guides/            # 使用指南
│   └── cleanup/           # 清理记录
├── tests/                   # 测试
│   ├── tests_html/        # HTML测试文件
│   └── test_data/         # 测试数据
├── scripts/                 # 部署脚本
├── tools/                   # 工具脚本
├── config/                  # 配置文件
└── README.md               # 项目说明
```

## 📝 命名规范

### 文件命名
- **Python：** `snake_case.py` (例如：`user_service.py`)
- **JavaScript：** `camelCase.js` 或 `kebab-case.js` (例如：`userService.js` 或 `user-service.js`)
- **CSS：** `kebab-case.css` (例如：`user-profile.css`)
- **HTML：** `kebab-case.html` (例如：`user-profile.html`)
- **文档：** `UPPERCASE.md` 或 `kebab-case.md` (例如：`README.md` 或 `user-guide.md`)

### 目录命名
- 使用 `kebab-case` 或 `snake_case`
- 保持简短且描述性
- 避免使用缩写（除非是通用缩写如 `css`, `js`, `api`）

## 🔍 代码审查标准

### 提交前检查清单

在提交代码前，必须确认：

- [ ] **文件组织**
  - [ ] 没有文件堆积在根目录
  - [ ] 所有文件都在正确的分类目录中
  - [ ] 临时文件已删除或移到temp目录

- [ ] **代码质量**
  - [ ] 没有文件超过500行（HTML可以1000行）
  - [ ] 没有函数超过50行
  - [ ] 每个模块职责单一明确
  - [ ] 代码有适当的注释

- [ ] **模块化**
  - [ ] 新功能没有使现有文件过于复杂
  - [ ] 相关功能已经合理分组
  - [ ] 模块之间依赖关系清晰

- [ ] **测试**
  - [ ] 测试文件在 `tests/` 目录
  - [ ] 测试覆盖了主要功能
  - [ ] 测试文件命名规范

## 🚨 违规处理

### 发现违规时的处理流程

1. **立即停止** - 不要继续添加代码
2. **评估影响** - 确定需要重构的范围
3. **制定计划** - 创建重构任务清单
4. **执行重构** - 按计划拆分和整理
5. **验证结果** - 确保功能正常且结构清晰

### 常见违规场景

**场景1：根目录文件过多**
```bash
# 解决方案：批量移动文件
git mv test_*.py tests/
git mv *.md docs/
git mv deploy_*.sh scripts/
```

**场景2：文件过大**
```javascript
// 解决方案：拆分模块
// 1. 识别独立功能
// 2. 提取到新文件
// 3. 更新导入引用
// 4. 测试验证
```

**场景3：功能堆积**
```python
# 解决方案：按职责拆分
# 1. 分析文件职责
# 2. 创建新的模块目录
# 3. 按功能迁移代码
# 4. 更新导入路径
```

## 📚 参考资源

### 相关文档
- `.kiro/specs/html-js-refactoring/` - HTML/JS重构规范
- `docs/DIRECTORY_STRUCTURE.md` - 目录结构说明
- `.kiro/specs/html-js-refactoring/PATH_REFERENCE_GUIDE.md` - 路径引用指南

### 最佳实践
1. **先规划，后编码** - 在添加功能前先考虑文件组织
2. **持续重构** - 不要等到文件过大才拆分
3. **保持简单** - 每个模块做好一件事
4. **文档同步** - 重构时同步更新文档

## ✅ 执行要求

**所有开发工作必须遵守本规范。**

- 创建新文件时，必须放在正确的目录
- 修改现有文件时，必须检查是否需要拆分
- 提交代码前，必须完成检查清单
- 发现违规时，必须立即重构

**本规范优先级：HIGH**
**适用范围：所有代码和文档**
**更新日期：2026-02-06**
