# 功能六批量专利解读增强 - 设计文档

## 架构设计

### 整体架构
```
功能六界面
├── 专利号输入区
├── 模板管理区（新增）
│   ├── 模板选择器
│   ├── 字段配置器
│   └── 模板操作按钮
├── 查询按钮区
├── 专利结果列表
│   └── 专利卡片
│       ├── 基本信息
│       ├── "问一问"按钮（新增）
│       └── 复制按钮
├── 解读结果区
└── 导出按钮

对话弹窗（新增）
├── 弹窗头部（专利信息）
├── 对话历史区
├── 输入框
└── 发送按钮
```

## 数据结构设计

### 1. 解读模板数据结构
```javascript
{
  id: "template_uuid",
  name: "模板名称",
  description: "模板描述",
  isPreset: false,  // 是否为预设模板
  fields: [
    {
      id: "field_uuid",
      name: "字段名称",
      description: "字段描述（用于AI提示）",
      type: "text" | "list",  // 文本或列表
      required: true | false
    }
  ],
  systemPrompt: "你是专利分析专家...",
  createdAt: "2026-01-26T00:00:00Z",
  updatedAt: "2026-01-26T00:00:00Z"
}
```

### 2. 专利对话状态
```javascript
{
  patentNumber: "CN123456789A",
  patentData: { /* 完整专利数据 */ },
  messages: [
    { role: "system", content: "专利上下文..." },
    { role: "user", content: "用户问题" },
    { role: "assistant", content: "AI回答" }
  ],
  isOpen: true
}
```

## UI设计

### 1. 模板管理界面

#### 位置
在"专利号输入区"和"查询按钮区"之间插入

#### 布局
```html
<div class="template-management-section">
  <div class="template-header">
    <label>解读模板：</label>
    <select id="template_selector">
      <optgroup label="预设模板">
        <option value="default">默认模板</option>
        <option value="technical">技术分析模板</option>
        <option value="business">商业价值模板</option>
      </optgroup>
      <optgroup label="自定义模板">
        <option value="custom_1">我的模板1</option>
      </optgroup>
    </select>
    <button class="small-button" id="manage_template_btn">管理模板</button>
  </div>
  
  <!-- 展开的模板编辑器（默认隐藏） -->
  <div id="template_editor" style="display: none;">
    <div class="template-info">
      <input type="text" id="template_name" placeholder="模板名称">
      <textarea id="template_description" placeholder="模板描述"></textarea>
    </div>
    
    <div class="fields-container">
      <h5>字段配置：</h5>
      <div id="fields_list">
        <!-- 动态生成字段配置项 -->
      </div>
      <button class="small-button" id="add_field_btn">+ 添加字段</button>
    </div>
    
    <div class="template-actions">
      <button class="small-button" id="save_template_btn">保存模板</button>
      <button class="small-button" id="new_template_btn">新建模板</button>
      <button class="small-button delete-button" id="delete_template_btn">删除模板</button>
      <button class="small-button" id="export_template_btn">导出模板</button>
      <button class="small-button" id="import_template_btn">导入模板</button>
      <button class="small-button" id="cancel_edit_btn">取消</button>
    </div>
  </div>
</div>
```

### 2. 专利卡片"问一问"按钮

#### 位置
在专利卡片标题栏右侧

#### 样式
```html
<div class="patent-card-header">
  <h5>CN123456789A - 专利标题</h5>
  <button class="ask-patent-btn" onclick="openPatentChat('CN123456789A')">
    <svg>💬</svg> 问一问
  </button>
</div>
```

### 3. 专利对话弹窗

#### 布局
```html
<div id="patent_chat_modal" class="modal" style="display: none;">
  <div class="modal-content patent-chat-modal">
    <div class="modal-header">
      <div class="patent-info">
        <h4>专利对话：CN123456789A</h4>
        <p class="patent-title">专利标题</p>
      </div>
      <button class="close-btn" onclick="closePatentChat()">&times;</button>
    </div>
    
    <div class="modal-body">
      <div id="patent_chat_history" class="chat-history">
        <!-- 对话历史 -->
      </div>
      
      <div class="chat-input-area">
        <textarea id="patent_chat_input" placeholder="请输入您的问题..."></textarea>
        <button id="patent_chat_send_btn" class="small-button">发送</button>
      </div>
    </div>
  </div>
</div>
```

## API设计

### 1. 解读API增强
```
POST /patent/analyze
Request:
{
  "patent_data": { /* 专利数据 */ },
  "template": {
    "fields": [
      { "name": "字段名", "description": "字段描述" }
    ],
    "system_prompt": "自定义系统提示"
  },
  "include_specification": true
}

Response:
{
  "choices": [{
    "message": {
      "content": "{\"字段名1\": \"内容1\", \"字段名2\": \"内容2\"}"
    }
  }]
}
```

### 2. 专利对话API
```
POST /patent/chat
Request:
{
  "patent_number": "CN123456789A",
  "patent_data": { /* 专利数据 */ },
  "messages": [
    { "role": "user", "content": "用户问题" }
  ]
}

Response:
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "AI回答"
    }
  }]
}
```

## 状态管理

### 模板状态
```javascript
appState.patentBatch = {
  templates: [],  // 所有模板
  currentTemplate: null,  // 当前选中的模板
  isEditingTemplate: false,  // 是否正在编辑模板
  patentChats: {}  // 专利对话状态 { patentNumber: chatState }
}
```

## 样式设计

### 1. 模板管理区样式
```css
.template-management-section {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
}

.template-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fields-container {
  margin-top: 15px;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 5px;
}

.field-config-item {
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: 10px;
  margin-bottom: 10px;
  padding: 10px;
  background: white;
  border-radius: 4px;
}
```

### 2. 问一问按钮样式
```css
.ask-patent-btn {
  padding: 5px 12px;
  font-size: 0.85em;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s;
}

.ask-patent-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}
```

### 3. 对话弹窗样式
```css
.patent-chat-modal {
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.patent-chat-modal .modal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 5px;
  margin-bottom: 15px;
}

.chat-input-area {
  display: flex;
  gap: 10px;
}

.chat-input-area textarea {
  flex: 1;
  min-height: 60px;
  resize: vertical;
}
```

## 实现优先级

### Phase 1: 核心功能（P0）
1. 模板数据结构和存储
2. 模板选择器UI
3. 字段配置器UI
4. 解读API适配模板
5. 专利卡片添加"问一问"按钮
6. 对话弹窗基础UI
7. 对话API实现

### Phase 2: 增强功能（P1）
1. 模板导入/导出
2. 预设模板库
3. 多轮对话历史
4. 对话内容复制/导出

### Phase 3: 优化功能（P2）
1. 模板验证和错误提示
2. 对话快捷操作（常见问题）
3. 移动端优化
4. 性能优化
