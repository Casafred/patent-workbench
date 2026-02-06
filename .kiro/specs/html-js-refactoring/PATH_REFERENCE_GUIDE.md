# 路径引用规范指南

## 📁 目录结构

```
项目根目录/
├── frontend/
│   ├── components/          # HTML组件目录
│   │   ├── header.html      # 头部组件
│   │   ├── tab-navigation.html  # 标签导航组件
│   │   └── tabs/            # 功能标签页组件
│   │       ├── instant-chat.html
│   │       ├── async-batch.html
│   │       ├── large-batch.html
│   │       ├── local-patent-lib.html
│   │       ├── claims-comparison.html
│   │       ├── patent-batch.html
│   │       ├── claims-processor.html
│   │       └── drawing-marker.html
│   ├── css/                 # CSS文件 (已存在,不修改)
│   ├── js/                  # 前端JS文件 (已存在)
│   └── index.html           # 主HTML文件 (将被简化)
│
├── js/                      # JavaScript模块目录
│   ├── core/                # 核心模块
│   │   ├── component-loader.js  # 组件加载器
│   │   ├── main.js          # 主初始化文件 (重构后)
│   │   └── api.js           # API客户端 (从main.js提取)
│   │
│   ├── modules/             # 功能模块
│   │   ├── chat/            # 聊天功能模块
│   │   │   ├── chat-core.js
│   │   │   ├── chat-file-handler.js
│   │   │   ├── chat-conversation.js
│   │   │   ├── chat-message.js
│   │   │   ├── chat-persona.js
│   │   │   ├── chat-search.js
│   │   │   └── chat-export.js
│   │   │
│   │   ├── claims/          # 权利要求处理模块
│   │   │   ├── claims-core.js
│   │   │   ├── claims-file-handler.js
│   │   │   ├── claims-processor.js
│   │   │   ├── claims-visualization.js
│   │   │   ├── claims-text-analyzer.js
│   │   │   └── claims-patent-search.js
│   │   │
│   │   ├── navigation/      # 导航模块
│   │   │   └── tab-navigation.js
│   │   │
│   │   └── init/            # 初始化模块
│   │       ├── init-async-batch.js
│   │       ├── init-large-batch.js
│   │       ├── init-local-patent-lib.js
│   │       ├── init-claims-comparison.js
│   │       └── init-patent-batch.js
│   │
│   ├── state.js             # 状态管理 (已存在,保持不变)
│   ├── chat.js              # 原始文件 (将被重构)
│   ├── claimsProcessorIntegrated.js  # 原始文件 (将被重构)
│   └── main.js              # 原始文件 (将被重构)
```

## 🔗 路径引用规则

### 1. HTML中引用JavaScript

**在 `frontend/index.html` 中:**

```html
<!-- 核心模块 - 使用相对于项目根目录的路径 -->
<script src="js/core/component-loader.js"></script>
<script src="js/core/api.js"></script>
<script src="js/state.js"></script>

<!-- 主初始化文件 -->
<script src="js/core/main.js" type="module"></script>
```

**在组件HTML文件中 (如 `frontend/components/tabs/instant-chat.html`):**
- 组件HTML文件**不应该**包含 `<script>` 标签
- 所有JavaScript逻辑应该在对应的模块中处理
- 事件处理器使用全局函数或通过模块初始化绑定

### 2. JavaScript中引用其他JavaScript模块

**ES6模块导入 (推荐):**

```javascript
// 在 js/core/main.js 中导入其他核心模块
import { loadComponent } from './component-loader.js';
import { apiCall } from './api.js';

// 导入功能模块
import { initChat } from '../modules/chat/chat-core.js';
import { initClaimsProcessor } from '../modules/claims/claims-core.js';
```

**传统script标签方式:**

```html
<!-- 按依赖顺序加载 -->
<script src="js/core/component-loader.js"></script>
<script src="js/core/api.js"></script>
<script src="js/modules/chat/chat-core.js"></script>
```

### 3. JavaScript中加载HTML组件

**从 `js/core/main.js` 加载组件:**

```javascript
// 加载头部组件
await loadComponent('frontend/components/header.html', 'header-component');

// 加载标签导航
await loadComponent('frontend/components/tab-navigation.html', 'tab-navigation-component');

// 加载功能标签页
await loadComponent('frontend/components/tabs/instant-chat.html', 'instant-tab');
```

**路径规则:**
- 所有路径都是**相对于项目根目录**
- 使用正斜杠 `/` (不是反斜杠 `\`)
- 不要以 `/` 开头 (相对路径,不是绝对路径)

### 4. CSS引用

**在 `frontend/index.html` 中:**

```html
<!-- CSS路径保持不变 -->
<link rel="stylesheet" href="frontend/css/main.css">
<link rel="stylesheet" href="frontend/css/pages/claims.css">
<link rel="stylesheet" href="frontend/css/components/patent-template.css">
```

**在组件HTML中:**
- 不要在组件HTML中包含 `<link>` 标签
- 所有CSS应该在主 `index.html` 中引入

## ⚠️ 常见错误和注意事项

### ❌ 错误示例

```javascript
// 错误: 使用绝对路径
await loadComponent('/frontend/components/header.html', 'header-component');

// 错误: 使用反斜杠
await loadComponent('frontend\\components\\header.html', 'header-component');

// 错误: 路径不完整
await loadComponent('components/header.html', 'header-component');

// 错误: 在组件HTML中包含script标签
<!-- frontend/components/header.html -->
<header>...</header>
<script src="../../js/some-script.js"></script>  <!-- ❌ 不要这样做 -->
```

### ✅ 正确示例

```javascript
// 正确: 相对于项目根目录的路径
await loadComponent('frontend/components/header.html', 'header-component');

// 正确: 使用正斜杠
await loadComponent('frontend/components/tabs/instant-chat.html', 'instant-tab');

// 正确: 完整路径
await loadComponent('frontend/components/tab-navigation.html', 'tab-navigation-component');
```

## 🔍 路径验证清单

在添加任何新的路径引用时,请检查:

- [ ] 路径是否相对于项目根目录?
- [ ] 是否使用正斜杠 `/`?
- [ ] 路径是否完整 (包含所有目录层级)?
- [ ] 目标文件是否存在?
- [ ] 在浏览器开发者工具中是否有404错误?

## 📝 模块依赖关系

### 核心模块依赖

```
component-loader.js (无依赖)
    ↓
api.js (依赖: state.js)
    ↓
main.js (依赖: component-loader.js, api.js, state.js, 所有功能模块)
```

### 功能模块依赖

```
chat-core.js
    ├── chat-file-handler.js (依赖: fileParserHandler.js, state.js)
    ├── chat-conversation.js (依赖: state.js)
    ├── chat-message.js (依赖: state.js)
    ├── chat-persona.js (依赖: state.js)
    ├── chat-search.js (依赖: api.js, state.js)
    └── chat-export.js (依赖: html2canvas, jsPDF)

claims-core.js
    ├── claims-file-handler.js (依赖: api.js, state.js)
    ├── claims-processor.js (依赖: api.js, state.js)
    ├── claims-visualization.js (依赖: d3.js, state.js)
    ├── claims-text-analyzer.js (依赖: api.js, state.js)
    └── claims-patent-search.js (依赖: api.js, state.js)
```

## 🚀 加载顺序

**推荐的脚本加载顺序:**

1. 外部库 (jQuery, D3.js, etc.)
2. `js/state.js` (状态管理)
3. `js/core/component-loader.js` (组件加载器)
4. `js/core/api.js` (API客户端)
5. 功能模块 (chat, claims, etc.)
6. `js/core/main.js` (主初始化,最后加载)

## 📚 参考资源

- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [HTML5 Rocks: ES6 Modules](https://www.html5rocks.com/en/tutorials/es6/modules/)
