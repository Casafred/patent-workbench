## 修改计划：双服务商模型统一选择

### 核心思路
从"服务商互斥"改为"模型优先"：用户选择模型时，系统自动识别该模型属于哪个服务商，并使用对应的API Key。

---

### 1. 模型配置改造 (`config/models.json`)
**目标**：为每个模型添加provider标识

- 新增 `model_provider_map` 字段，建立模型→服务商的映射
- 示例：`{"glm-4-flash": "zhipu", "qwen-plus": "aliyun", ...}`

---

### 2. 前端服务商管理改造 (`js/core/provider.js`)
**目标**：支持模型优先选择

- 新增 `getProviderForModel(model)` 方法：根据模型返回服务商
- 修改 `getApiHeaders(model)` 方法：接受模型参数，返回对应服务商的headers
- 新增 `hasApiKey(provider)` 方法：检测某服务商Key是否已配置
- 新增 `getAvailableModels()` 方法：合并返回所有已配置Key的服务商的模型

---

### 3. 状态管理改造 (`js/state.js`)
**目标**：合并显示所有可用模型

- 修改 `updateModelsForProvider()` 为 `updateAvailableModels()`
- 逻辑：检测已配置的API Key → 合并对应服务商的模型列表
- 更新所有模型选择器显示合并后的模型列表

---

### 4. 翻译功能修复 (`js/main.js`)
**目标**：移除硬编码智谱URL

- 修改 `translateClaimsDirect()` 和 `translateDescriptionDirect()`
- 改为调用后端 `/api/stream_chat` 或 `/api/translate` 代理接口
- 根据选择的模型自动路由到对应服务商

---

### 5. 翻译功能修复 (`js/patentDetailNewTab.js`)
**目标**：移除硬编码智谱URL

- 修改 `startTranslationNewTab()` 函数
- 改为调用后端代理接口
- 支持从 `window.opener` 获取两个服务商的API Key

---

### 6. 批量处理引擎改造 (`js/async-engine.js`, `js/batch-engine.js`)
**目标**：支持双服务商批量处理

- 修改请求体，添加 `provider` 和 `model` 参数
- 后端根据参数路由到对应服务商的批量API

---

### 7. 后端批量处理路由改造 (`backend/routes/async_batch.py`)
**目标**：支持双服务商

- 修改所有端点，根据请求中的 `model` 或 `provider` 参数选择客户端
- 智谱模型 → 使用 `get_zhipu_client()`
- 阿里云模型 → 使用阿里云客户端（参考 `bailian_test.py` 实现）

---

### 8. PDF-OCR悬浮对话统一 (`js/pdf-ocr-floating-chat.js`)
**目标**：与主界面状态同步

- 监听主界面 `providerChanged` 事件（已有）
- 修改模型列表为合并显示所有可用模型
- 根据选择的模型自动切换服务商

---

### 文件修改清单

| 文件 | 修改类型 |
|------|---------|
| `config/models.json` | 新增映射表 |
| `js/core/provider.js` | 核心改造 |
| `js/state.js` | 核心改造 |
| `js/main.js` | 翻译功能修复 |
| `js/patentDetailNewTab.js` | 翻译功能修复 |
| `js/modules/unified-batch/engines/async-engine.js` | 批量处理改造 |
| `js/modules/unified-batch/engines/batch-engine.js` | 批量处理改造 |
| `backend/routes/async_batch.py` | 后端双服务商支持 |
| `js/modules/pdf-ocr/pdf-ocr-floating-chat.js` | 状态同步 |