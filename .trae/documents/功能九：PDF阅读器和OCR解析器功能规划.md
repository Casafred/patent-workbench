# 功能九：PDF阅读器和OCR解析器功能规划

## 一、功能概述

基于智谱GLM-OCR API，构建一个专业的PDF阅读器和OCR解析器，实现：
1. 用户上传图片、PDF等文档
2. 利用GLM-OCR进行智能解析
3. 结构化内容识别、翻译展示
4. PDF阅读器样式查看器
5. 根据页面位置进行段落解析和指定翻译
6. 嵌入AI问答功能对解析结果直接提问

## 二、GLM-OCR API 参考

**API端点**: `POST https://open.bigmodel.cn/api/paas/v4/layout_parsing`

**请求参数**:
```json
{
  "model": "glm-ocr",
  "file": "https://example.com/document.pdf"  // 或图片URL
}
```

**响应结构**:
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "page_num": 1,
        "content": "...",
        "blocks": [
          {
            "type": "text|table|formula|image",
            "bbox": [x1, y1, x2, y2],
            "content": "...",
            "translation": "..."
          }
        ]
      }
    ]
  }
}
```

## 三、文件结构规划

### 1. 前端组件文件
```
frontend/components/tabs/pdf-ocr-reader.html    # 功能九主界面HTML
```

### 2. JavaScript模块文件
```
js/modules/pdf-ocr/pdf-ocr-core.js              # 核心功能模块
js/modules/pdf-ocr/pdf-ocr-viewer.js            # PDF阅读器视图
js/modules/pdf-ocr/pdf-ocr-parser.js            # OCR解析逻辑
js/modules/pdf-ocr/pdf-ocr-chat.js              # AI问答集成
js/modules/pdf-ocr/pdf-ocr-init.js              # 初始化模块
```

### 3. CSS样式文件
```
frontend/css/components/pdf-ocr-reader.css      # 功能九专属样式
```

### 4. 后端API路由（如需新增）
```
backend/routes/pdf_ocr.py                       # 后端代理路由
```

## 四、界面架构设计

### 主界面布局（三栏式）
```
┌─────────────────────────────────────────────────────────────┐
│  功能九：PDF阅读与OCR解析                                      │
├──────────────┬──────────────────────────────┬───────────────┤
│              │                              │               │
│   左侧栏      │        中间阅读区            │    右侧栏      │
│   文件上传    │        PDF/图片预览          │    AI问答      │
│   + 页面缩略图 │        + 结构化内容          │    + 翻译      │
│              │                              │               │
├──────────────┴──────────────────────────────┴───────────────┤
│                    底部：解析进度/状态栏                       │
└─────────────────────────────────────────────────────────────┘
```

### 详细组件

#### 左侧栏（20%宽度）
1. **文件上传区**
   - 拖拽上传区域
   - 支持PDF、PNG、JPG、JPEG、BMP、WEBP
   - 文件列表显示
   - 删除/切换文件按钮

2. **页面缩略图导航**
   - 垂直滚动缩略图列表
   - 点击跳转对应页面
   - 当前页面高亮指示
   - 页面解析状态图标

3. **OCR控制面板**
   - "开始OCR解析"按钮
   - 解析模式选择（全文/当前页/选定区域）
   - 目标语言选择（中文/英文/日文等）
   - 进度显示

#### 中间阅读区（55%宽度）
1. **工具栏**
   - 缩放控制（- / + / 适应宽度 / 适应页面）
   - 页面导航（上一页 / 下一页 / 页码输入）
   - 视图模式（单页 / 双页 / 连续滚动）
   - 文本选择工具
   - 区域选择工具（用于局部OCR）

2. **文档渲染区**
   - PDF.js渲染PDF页面
   - 图片直接显示
   - 文本层覆盖（可选）
   - 标注层（显示OCR识别的区块）

3. **结构化内容展示**
   - 标签页切换：原文 / 结构化 / 翻译
   - 内容类型筛选（全部/文本/表格/公式/图片）
   - 点击同步定位到阅读区位置

#### 右侧栏（25%宽度）
1. **AI问答区**
   - 对话历史显示
   - 输入框 + 发送按钮
   - 快捷问题按钮（总结/翻译/解释）
   - 引用当前选中内容

2. **翻译面板**
   - 原文显示
   - 译文显示
   - 一键复制
   - 术语高亮

3. **解析结果统计**
   - 页面数
   - 识别文本块数
   - 表格数
   - 公式数

## 五、核心功能模块

### 1. 文件上传与预览模块
```javascript
// js/modules/pdf-ocr/pdf-ocr-core.js
class PDFOCRCore {
    constructor() {
        this.currentFile = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.ocrResults = null;
        this.pdfDocument = null;
    }
    
    async uploadFile(file) {
        // 上传文件到服务器或转为Base64
    }
    
    async loadPDF(url) {
        // 使用PDF.js加载PDF
    }
    
    async renderPage(pageNum) {
        // 渲染指定页面
    }
}
```

### 2. OCR解析模块
```javascript
// js/modules/pdf-ocr/pdf-ocr-parser.js
class GLMOCRParser {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://open.bigmodel.cn/api/paas/v4/layout_parsing';
    }
    
    async parseDocument(fileUrl, options = {}) {
        // 调用GLM-OCR API
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'glm-ocr',
                file: fileUrl,
                ...options
            })
        });
        return response.json();
    }
    
    parsePageBlocks(pageData) {
        // 解析页面内容块
        return pageData.blocks.map(block => ({
            type: block.type,
            bbox: block.bbox,
            content: block.content,
            translation: block.translation
        }));
    }
}
```

### 3. 阅读器视图模块
```javascript
// js/modules/pdf-ocr/pdf-ocr-viewer.js
class PDFViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scale = 1.0;
        this.currentPage = 1;
    }
    
    renderThumbnail(pageNum, canvas) {
        // 渲染缩略图
    }
    
    highlightBlock(bbox) {
        // 高亮显示OCR识别区块
    }
    
    syncScrollToBlock(blockId) {
        // 同步滚动到指定区块
    }
}
```

### 4. AI问答模块
```javascript
// js/modules/pdf-ocr/pdf-ocr-chat.js
class PDFOCRChat {
    constructor() {
        this.conversation = [];
        this.contextContent = '';
    }
    
    async askQuestion(question, selectedText = '') {
        // 构建提示词，包含OCR解析的上下文
        const prompt = this.buildPrompt(question, selectedText);
        // 调用API获取回答
    }
    
    buildPrompt(question, selectedText) {
        return `基于以下文档内容回答问题：\n\n${this.contextContent}\n\n${selectedText ? '选中内容：' + selectedText + '\n\n' : ''}问题：${question}`;
    }
}
```

## 六、样式规范（遵循现有项目）

### 颜色变量（复用现有）
```css
:root {
    --primary-color: #4ade80;
    --primary-color-dark: #22c55e;
    --primary-color-hover-bg: rgba(74, 222, 128, 0.1);
    --surface-color: #ffffff;
    --bg-color: #f0fdf4;
    --border-color: #dcfce7;
    --text-color: #1f2937;
    --text-color-secondary: #6b7280;
    --error-color: #ef4444;
    --warning-color: #f59e0b;
}
```

### 组件样式
- 按钮：复用 `.action-button` 和 `.small-button`
- 输入框：复用现有表单样式
- 卡片：使用 `border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);`
- 标签页：复用 `.tab-button` 样式

## 七、集成步骤

### 1. 添加导航标签
在 `frontend/components/tab-navigation.html` 添加：
```html
<button class="tab-button" onclick="switchTab('pdf_ocr_reader', this)">功能九：PDF阅读与OCR</button>
```

### 2. 主HTML入口
在 `frontend/index.html` 添加组件容器：
```html
<div id="pdf-ocr-reader-component"></div>
```

### 3. 脚本加载
在 `frontend/index.html` 底部添加：
```html
<script src="js/modules/pdf-ocr/pdf-ocr-core.js"></script>
<script src="js/modules/pdf-ocr/pdf-ocr-viewer.js"></script>
<script src="js/modules/pdf-ocr/pdf-ocr-parser.js"></script>
<script src="js/modules/pdf-ocr/pdf-ocr-chat.js"></script>
<script src="js/modules/pdf-ocr/pdf-ocr-init.js"></script>
```

### 4. main.js集成
在 `js/main.js` 添加初始化：
```javascript
// Load Feature 9 (PDF OCR Reader) component
try {
    const loaded = await loadComponent('frontend/components/tabs/pdf-ocr-reader.html', 'pdf-ocr-reader-component', {
        requiredElements: ['pdf_upload_input', 'pdf_viewer_container', 'ocr_result_panel'],
        timeout: 5000
    });
    if (loaded) {
        if (typeof initPDFOCRReader === 'function') {
            initPDFOCRReader();
        }
        LoadingManager.updateProgress('初始化PDF阅读器');
    }
} catch (error) {
    console.error('❌ Failed to load Feature 9 (PDF OCR Reader) component:', error);
}
```

### 5. 状态管理集成
在 `js/state.js` 添加状态对象：
```javascript
pdfOCRReader: {
    currentFile: null,
    ocrResults: null,
    currentPage: 1,
    viewerScale: 1.0,
    selectedBlocks: [],
    chatHistory: []
}
```

## 八、后端API代理（可选）

如需后端代理处理文件上传：

```python
# backend/routes/pdf_ocr.py
from flask import Blueprint, request, jsonify
import requests

pdf_ocr_bp = Blueprint('pdf_ocr', __name__)

@pdf_ocr_bp.route('/api/pdf-ocr/parse', methods=['POST'])
def parse_pdf():
    """代理GLM-OCR API请求"""
    data = request.json
    api_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    
    response = requests.post(
        'https://open.bigmodel.cn/api/paas/v4/layout_parsing',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json=data
    )
    
    return jsonify(response.json())
```

## 九、功能特性清单

### 基础功能
- [x] 拖拽上传PDF/图片
- [x] PDF.js渲染预览
- [x] 页面缩略图导航
- [x] 缩放和页面导航
- [x] GLM-OCR API调用
- [x] 结构化内容展示

### 高级功能
- [x] 指定区域OCR
- [x] 多语言翻译
- [x] 内容类型筛选
- [x] 点击同步定位
- [x] AI问答集成
- [x] 对话历史保存

### 用户体验
- [x] 解析进度显示
- [x] 错误提示处理
- [x] 结果导出（JSON/Markdown）
- [x] 响应式布局
- [x] 键盘快捷键支持

## 十、开发顺序建议

1. **第一阶段**：基础框架
   - 创建HTML组件结构
   - 实现文件上传和PDF预览
   - 集成到主应用

2. **第二阶段**：OCR功能
   - 实现GLM-OCR API调用
   - 结构化内容展示
   - 页面缩略图导航

3. **第三阶段**：高级功能
   - AI问答集成
   - 翻译功能
   - 区域选择OCR

4. **第四阶段**：优化完善
   - 样式美化
   - 性能优化
   - 错误处理
   - 用户体验优化

---

**预计开发时间**：3-5天
**复杂度**：中等（需集成PDF.js和GLM-OCR API）
**依赖**：PDF.js库、GLM-OCR API Key