## 改进计划

### 1. PDF-OCR悬浮对话 (`pdf-ocr-floating-chat.js`)
- 改用后端统一API接口 `/stream_chat`
- 添加服务商切换UI（复用ProviderManager）
- 动态加载模型列表（根据当前服务商）
- 添加深度思考模式按钮（参考chat-core.js实现）
- 根据模型类型自动显示/隐藏思考按钮

### 2. PDF-OCR问答模块 (`pdf-ocr-chat.js`)
- 改用后端统一API接口 `/stream_chat`
- 添加服务商切换UI
- 动态加载模型列表
- 添加深度思考模式支持

### 3. 专利对话功能 (`patentChat.js`)
- 添加模型选择下拉框UI
- 集成ProviderManager实现服务商切换
- 添加深度思考模式按钮
- 在请求中传递provider和enable_thinking参数

### 4. 统一改进内容
- 所有AI对话界面统一使用 `ProviderManager` 管理服务商
- 统一使用后端 `/stream_chat` 接口
- 深度思考模式逻辑：
  - 仅阿里云部分模型支持（qwq-plus, deepseek-r1等）
  - 某些模型为"仅思考模式"（自动启用）
  - 按钮根据当前模型动态显示/隐藏

### 涉及文件
1. `js/modules/pdf-ocr/pdf-ocr-floating-chat.js`
2. `js/modules/pdf-ocr/pdf-ocr-chat.js`
3. `js/patentChat.js`
4. `frontend/components/tabs/pdf-ocr-reader.html`（可能需要添加UI元素）