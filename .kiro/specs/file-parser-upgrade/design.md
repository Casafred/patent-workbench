# Design Document: 文件解析API升级

## Overview

本设计文档描述了从旧的智谱AI文件管理API迁移到新的文件解析API的技术方案。新的文件解析服务提供了更强大的文件内容提取能力，支持多种文件格式的智能解析，并提供三种不同级别的解析服务以满足不同场景需求。

### 核心变更

1. **API端点变更**：
   - 旧API：`client.files.create()` + `client.files.content()`
   - 新API：`POST /api/paas/v4/files/parser/create` + `GET /api/paas/v4/files/parser/result/{taskId}/{format_type}`

2. **工作流程变更**：
   - 旧流程：上传文件 → 获取file_id → 直接读取原始内容
   - 新流程：上传文件 → 创建解析任务 → 轮询获取解析结果 → 提取文本内容

3. **解析服务选择**：
   - Lite：免费，支持常见格式，返回纯文本
   - Expert：付费，专业PDF解析，返回Markdown+图片
   - Prime：付费，支持最多格式，返回完整结构化内容

## Architecture

### 系统架构图

```mermaid
graph TB
    subgraph "前端 Frontend"
        A[文件选择器] --> B[上传处理器]
        B --> C[进度显示组件]
        C --> D[状态管理]
        D --> E[对话上下文]
    end
    
    subgraph "后端 Backend"
        F[/files/parser/create] --> G[解析任务创建器]
        H[/files/parser/result/:taskId] --> I[结果轮询器]
        G --> J[智谱AI解析API]
        I --> J
    end
    
    subgraph "智谱AI服务"
        J --> K[Lite解析服务]
        J --> L[Expert解析服务]
        J --> M[Prime解析服务]
    end
    
    B --> F
    D --> H
    I --> D
    
    style A fill:#e1f5ff
    style C fill:#e1f5ff
    style F fill:#fff4e6
    style H fill:#fff4e6
    style K fill:#f3e5f5
    style L fill:#f3e5f5
    style M fill:#f3e5f5
```

### 数据流

1. **文件上传流程**：
   ```
   用户选择文件 → 前端验证 → 调用后端API → 创建解析任务 → 返回task_id
   ```

2. **解析结果获取流程**：
   ```
   获取task_id → 轮询结果API → 检查状态 → 提取文本内容 → 更新UI
   ```

3. **对话集成流程**：
   ```
   解析完成 → 存储文本内容 → 用户发送消息 → 附加文件内容 → 调用对话API
   ```

## Components and Interfaces

### 后端组件

#### 1. FileParserService

负责与智谱AI文件解析API交互的核心服务。

```python
class FileParserService:
    """文件解析服务"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://open.bigmodel.cn/api/paas/v4"
    
    def create_parser_task(
        self, 
        file_path: str, 
        tool_type: str = "lite",
        file_type: str = None
    ) -> dict:
        """
        创建文件解析任务
        
        Args:
            file_path: 本地文件路径
            tool_type: 解析工具类型 (lite, expert, prime)
            file_type: 文件类型 (PDF, DOCX, etc.)
        
        Returns:
            {
                "task_id": "解析任务ID",
                "status": "processing"
            }
        """
        pass
    
    def get_parser_result(
        self, 
        task_id: str, 
        format_type: str = "text",
        timeout: int = 60
    ) -> dict:
        """
        获取解析结果（带轮询）
        
        Args:
            task_id: 解析任务ID
            format_type: 返回格式 (text, download_link)
            timeout: 超时时间（秒）
        
        Returns:
            {
                "status": "succeeded|failed|processing",
                "content": "解析后的文本内容",
                "error": "错误信息（如果失败）"
            }
        """
        pass
    
    def poll_result(
        self, 
        task_id: str, 
        interval: int = 2,
        max_attempts: int = 30
    ) -> dict:
        """
        轮询解析结果直到完成或超时
        
        Args:
            task_id: 解析任务ID
            interval: 轮询间隔（秒）
            max_attempts: 最大尝试次数
        
        Returns:
            解析结果或超时错误
        """
        pass
```

#### 2. Flask路由

```python
# backend/routes/file_parser.py

@file_parser_bp.route('/files/parser/create', methods=['POST'])
@login_required
def create_parser_task():
    """
    创建文件解析任务
    
    Form data:
        - file: 文件对象
        - tool_type: 解析服务类型 (lite, expert, prime)
        - file_type: 文件类型（可选，自动检测）
    
    Returns:
        {
            "task_id": "任务ID",
            "status": "processing",
            "filename": "文件名"
        }
    """
    pass

@file_parser_bp.route('/files/parser/result/<task_id>', methods=['GET'])
@login_required
def get_parser_result(task_id):
    """
    获取解析结果
    
    Path params:
        - task_id: 解析任务ID
    
    Query params:
        - format_type: 返回格式 (text, download_link)
        - poll: 是否轮询直到完成 (true, false)
    
    Returns:
        {
            "status": "succeeded|failed|processing",
            "content": "解析后的文本",
            "error": "错误信息"
        }
    """
    pass
```

### 前端组件

#### 1. 文件上传处理器

```javascript
// js/fileParserHandler.js

class FileParserHandler {
    constructor() {
        this.currentTask = null;
        this.pollingInterval = null;
    }
    
    /**
     * 处理文件上传和解析
     * @param {File} file - 文件对象
     * @param {string} toolType - 解析服务类型
     * @returns {Promise<Object>} 解析结果
     */
    async handleFileUpload(file, toolType = 'lite') {
        // 1. 验证文件
        this.validateFile(file);
        
        // 2. 显示上传进度
        this.showUploadProgress(file.name);
        
        // 3. 创建解析任务
        const taskResult = await this.createParserTask(file, toolType);
        
        // 4. 轮询获取结果
        const parseResult = await this.pollParserResult(taskResult.task_id);
        
        // 5. 更新UI
        this.showParseComplete(file.name, parseResult.content);
        
        return parseResult;
    }
    
    /**
     * 创建解析任务
     */
    async createParserTask(file, toolType) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tool_type', toolType);
        
        const response = await apiCall('/files/parser/create', formData, 'POST');
        return response;
    }
    
    /**
     * 轮询解析结果
     */
    async pollParserResult(taskId, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            const result = await apiCall(
                `/files/parser/result/${taskId}?format_type=text`, 
                undefined, 
                'GET'
            );
            
            if (result.status === 'succeeded') {
                return result;
            } else if (result.status === 'failed') {
                throw new Error(result.error || '解析失败');
            }
            
            // 等待2秒后继续轮询
            await this.sleep(2000);
            
            // 更新进度提示
            this.updateProgress(i, maxAttempts);
        }
        
        throw new Error('解析超时，请稍后重试');
    }
    
    /**
     * 验证文件
     */
    validateFile(file) {
        const supportedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'image/png',
            'image/jpeg',
            'text/plain',
            'text/markdown',
            'text/csv'
        ];
        
        if (!supportedTypes.includes(file.type)) {
            throw new Error(`不支持的文件类型: ${file.type}`);
        }
        
        // 检查文件大小限制
        const maxSize = this.getMaxFileSize(file.type);
        if (file.size > maxSize) {
            throw new Error(`文件大小超过限制: ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
        }
    }
    
    /**
     * 获取文件大小限制
     */
    getMaxFileSize(fileType) {
        if (fileType === 'application/pdf') {
            return 100 * 1024 * 1024; // 100MB
        } else if (fileType.includes('spreadsheet') || fileType === 'text/csv') {
            return 10 * 1024 * 1024; // 10MB
        } else if (fileType.includes('image')) {
            return 20 * 1024 * 1024; // 20MB
        } else {
            return 50 * 1024 * 1024; // 50MB
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

#### 2. UI状态管理

```javascript
// 在 js/chat.js 中修改

// 修改 handleChatFileUpload 函数
async function handleChatFileUpload(event, fileFromReuse = null) {
    const file = fileFromReuse || (event.target ? event.target.files[0] : null);
    if (!file) return;

    const parser = new FileParserHandler();
    
    try {
        // 使用新的解析处理器
        const result = await parser.handleFileUpload(file, 'lite');
        
        // 存储解析结果
        appState.chat.activeFile = {
            taskId: result.task_id,
            filename: file.name,
            content: result.content,
            toolType: 'lite'
        };
        
        // 更新UI显示
        chatFileStatusArea.innerHTML = `
            <div class="file-info">
                <svg>...</svg>
                <span>已附加文件:</span>
                <span class="filename">${file.name}</span>
            </div>
            <button class="file-remove-btn" onclick="removeActiveFile()">&times;</button>
        `;
        
    } catch (error) {
        alert(`文件解析失败: ${error.message}`);
        removeActiveFile();
    }
}
```

## Data Models

### 1. ParserTask（解析任务）

```python
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

@dataclass
class ParserTask:
    """文件解析任务数据模型"""
    task_id: str
    filename: str
    file_type: str
    tool_type: str  # lite, expert, prime
    status: str  # processing, succeeded, failed
    content: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = None
    completed_at: Optional[datetime] = None
    
    def to_dict(self) -> dict:
        return {
            'task_id': self.task_id,
            'filename': self.filename,
            'file_type': self.file_type,
            'tool_type': self.tool_type,
            'status': self.status,
            'content': self.content,
            'error': self.error,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
```

### 2. 前端状态模型

```javascript
// 在 appState.chat 中添加
appState.chat.fileParser = {
    currentTask: null,  // 当前解析任务
    history: [],        // 解析历史
    toolType: 'lite'    // 默认解析服务
};

// ParserTask 接口
interface ParserTask {
    taskId: string;
    filename: string;
    fileType: string;
    toolType: 'lite' | 'expert' | 'prime';
    status: 'processing' | 'succeeded' | 'failed';
    content?: string;
    error?: string;
    createdAt: number;
    completedAt?: number;
}
```

### 3. API请求/响应格式

#### 创建解析任务请求

```json
POST /files/parser/create
Content-Type: multipart/form-data

{
    "file": <binary>,
    "tool_type": "lite",
    "file_type": "PDF"
}
```

#### 创建解析任务响应

```json
{
    "task_id": "parser_task_123456",
    "status": "processing",
    "filename": "document.pdf"
}
```

#### 获取解析结果请求

```
GET /files/parser/result/{task_id}?format_type=text
```

#### 获取解析结果响应

```json
{
    "status": "succeeded",
    "content": "解析后的文本内容...",
    "task_id": "parser_task_123456"
}
```

或失败时：

```json
{
    "status": "failed",
    "error": "文件格式不支持",
    "task_id": "parser_task_123456"
}
```

## Correctness Properties

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 解析任务创建返回唯一ID

*For any* 文件上传请求，创建解析任务应该返回一个唯一的task_id，并且多次创建任务不应该产生重复的task_id

**Validates: Requirements 1.1, 1.2**

### Property 2: 支持的文件格式验证

*For any* 支持的文件格式（PDF, DOCX, DOC, XLS, XLSX, PPT, PPTX, PNG, JPG, JPEG, CSV, TXT, MD），系统应该接受该文件并成功创建解析任务

**Validates: Requirements 1.3**

### Property 3: 文件大小和格式错误处理

*For any* 超过大小限制的文件或不支持的文件格式，系统应该返回明确的错误信息，而不是崩溃或返回模糊的错误

**Validates: Requirements 1.4, 1.5, 6.1, 6.2, 6.4, 6.5**

### Property 4: 轮询机制持续性

*For any* 处于processing状态的解析任务，系统应该继续轮询直到状态变为succeeded或failed，或者达到超时限制

**Validates: Requirements 2.1, 2.2, 2.5**

### Property 5: 解析结果正确提取

*For any* 状态为succeeded的解析任务，系统应该能够提取并返回文本内容；*for any* 状态为failed的解析任务，系统应该返回失败原因

**Validates: Requirements 2.3, 2.4**

### Property 6: UI状态转换正确性

*For any* 文件上传和解析流程，UI状态应该按照正确的顺序转换：上传中 → 解析中 → 已完成（或失败），并且每个状态都应该显示相应的信息

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 7: 文件内容状态管理

*For any* 成功解析的文件，系统应该将文本内容存储在应用状态中，并在用户发送消息时将其附加到消息内容中，发送后应该清除活动文件状态

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 8: 消息元数据完整性

*For any* 附加了文件的用户消息，消息对象应该包含文件的元数据（文件名、task_id），并且UI应该显示文件附加标记

**Validates: Requirements 4.4, 4.5**

### Property 9: 解析服务选择逻辑

*For any* PDF文件，系统应该默认使用Lite服务；*for any* 图片或Office文档，系统应该使用Lite或Prime服务，并且UI应该显示当前使用的服务类型

**Validates: Requirements 5.1, 5.3, 5.4, 5.5**

### Property 10: 错误恢复和重试

*For any* 上传失败、解析失败或超时的情况，系统应该显示适当的错误信息并提供重试选项，确保用户可以从错误中恢复

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 11: 解析结果持久化

*For any* 成功完成的解析任务，系统应该在本地存储中保存任务ID和结果，并且支持查看、删除和复用这些结果

**Validates: Requirements 7.1, 7.2, 7.3, 7.5**

### Property 12: API请求格式正确性

*For any* 调用新的解析API的请求，应该使用正确的请求格式和参数，并且能够正确解析API响应提取所需数据

**Validates: Requirements 8.4, 8.5**

### Property 13: 前端交互状态管理

*For any* 正在进行的文件解析，输入框应该保持可用但发送按钮应该被禁用；*for any* 解析完成的情况，发送按钮应该自动启用

**Validates: Requirements 9.1, 9.2**

### Property 14: 资源清理完整性

*For any* 用户移除文件或取消解析任务的操作，系统应该清除所有相关的状态、UI元素和轮询定时器，确保没有资源泄漏

**Validates: Requirements 9.3, 9.5**

### Property 15: 文本内容结构保持

*For any* 包含结构化内容（如表格、特殊字符）的文件，解析后的文本应该保持原有结构，并正确处理编码

**Validates: Requirements 10.3, 10.4, 10.5**

## Error Handling

### 错误类型和处理策略

1. **文件验证错误**
   - 不支持的文件格式：返回400错误，提示支持的格式列表
   - 文件大小超限：返回400错误，提示具体的大小限制
   - 文件损坏：返回400错误，提示文件无法读取

2. **API调用错误**
   - 网络错误：显示"网络连接失败，请检查网络"，提供重试按钮
   - 认证错误：返回401错误，提示重新登录
   - 服务器错误：返回500错误，提示稍后重试

3. **解析错误**
   - 解析失败：显示智谱API返回的具体错误信息
   - 解析超时：显示"解析超时，请稍后重试"，提供重试按钮
   - 内容提取失败：显示"无法提取文件内容"

4. **状态管理错误**
   - 任务ID丢失：清除相关状态，提示用户重新上传
   - 存储空间不足：提示清理旧的解析记录

### 错误日志

所有错误都应该记录到控制台，包含：
- 错误类型
- 错误消息
- 堆栈跟踪
- 相关上下文（文件名、task_id等）

```python
import logging

logger = logging.getLogger(__name__)

def handle_parser_error(error, context):
    """统一的错误处理函数"""
    logger.error(
        f"File parser error: {error}",
        extra={
            'error_type': type(error).__name__,
            'context': context
        },
        exc_info=True
    )
    
    # 返回用户友好的错误信息
    if isinstance(error, NetworkError):
        return "网络连接失败，请检查网络连接"
    elif isinstance(error, TimeoutError):
        return "解析超时，请稍后重试"
    elif isinstance(error, ValidationError):
        return f"文件验证失败：{error.message}"
    else:
        return "处理文件时发生错误，请稍后重试"
```

## Testing Strategy

### 双重测试方法

本功能将采用单元测试和属性测试相结合的方式，确保全面的测试覆盖：

1. **单元测试**：验证具体示例、边缘情况和错误条件
2. **属性测试**：验证跨所有输入的通用属性

### 单元测试重点

单元测试应该专注于：
- API端点的存在性和基本功能（Requirements 8.1, 8.2, 8.3）
- 特定文件格式的处理示例
- 边缘情况（空文件、最大文件大小、特殊字符）
- 错误条件（网络失败、API错误、超时）
- UI组件的集成点

### 属性测试配置

**测试库选择**：
- Python后端：使用 `hypothesis` 库
- JavaScript前端：使用 `fast-check` 库

**测试配置**：
- 每个属性测试至少运行 **100次迭代**
- 每个测试必须引用设计文档中的属性
- 标签格式：`Feature: file-parser-upgrade, Property {number}: {property_text}`

**属性测试示例**：

```python
# backend/tests/test_file_parser_properties.py

from hypothesis import given, strategies as st
import pytest

# Feature: file-parser-upgrade, Property 1: 解析任务创建返回唯一ID
@given(st.binary(min_size=100, max_size=1000))
@pytest.mark.property_test
def test_unique_task_ids(file_content):
    """
    Property 1: For any file upload request, creating a parser task 
    should return a unique task_id
    """
    task_ids = set()
    
    for _ in range(10):
        result = create_parser_task(file_content, 'lite', 'PDF')
        assert result['task_id'] not in task_ids
        task_ids.add(result['task_id'])

# Feature: file-parser-upgrade, Property 2: 支持的文件格式验证
@given(st.sampled_from(['PDF', 'DOCX', 'DOC', 'XLS', 'XLSX', 'PPT', 'PPTX', 
                        'PNG', 'JPG', 'JPEG', 'CSV', 'TXT', 'MD']))
@pytest.mark.property_test
def test_supported_file_formats(file_type):
    """
    Property 2: For any supported file format, the system should accept 
    the file and successfully create a parser task
    """
    file_content = generate_test_file(file_type)
    result = create_parser_task(file_content, 'lite', file_type)
    
    assert 'task_id' in result
    assert result['status'] == 'processing'

# Feature: file-parser-upgrade, Property 4: 轮询机制持续性
@given(st.integers(min_value=1, max_value=10))
@pytest.mark.property_test
def test_polling_persistence(processing_cycles):
    """
    Property 4: For any parser task in processing state, the system 
    should continue polling until status changes or timeout
    """
    task_id = create_mock_task(processing_cycles)
    
    poll_count = 0
    def mock_poll():
        nonlocal poll_count
        poll_count += 1
        if poll_count < processing_cycles:
            return {'status': 'processing'}
        return {'status': 'succeeded', 'content': 'test content'}
    
    result = poll_result(task_id, mock_poll)
    
    assert poll_count == processing_cycles
    assert result['status'] == 'succeeded'
```

```javascript
// frontend/tests/fileParserHandler.test.js

import fc from 'fast-check';

// Feature: file-parser-upgrade, Property 6: UI状态转换正确性
test('Property 6: UI state transitions are correct', () => {
    fc.assert(
        fc.property(
            fc.string({ minLength: 1, maxLength: 100 }), // filename
            fc.constantFrom('processing', 'succeeded', 'failed'), // final status
            (filename, finalStatus) => {
                const handler = new FileParserHandler();
                const states = [];
                
                // Mock UI update function to track states
                handler.updateUI = (state) => states.push(state);
                
                // Simulate file upload and parsing
                handler.handleFileUpload(
                    new File(['test'], filename),
                    'lite',
                    finalStatus
                );
                
                // Verify state transitions
                expect(states[0]).toBe('uploading');
                expect(states[1]).toBe('parsing');
                expect(states[2]).toBe(finalStatus === 'succeeded' ? 'completed' : 'failed');
            }
        ),
        { numRuns: 100 }
    );
});

// Feature: file-parser-upgrade, Property 7: 文件内容状态管理
test('Property 7: File content state management', () => {
    fc.assert(
        fc.property(
            fc.string({ minLength: 10, maxLength: 1000 }), // file content
            fc.string({ minLength: 1, maxLength: 50 }), // filename
            (content, filename) => {
                const handler = new FileParserHandler();
                
                // Parse file
                const result = handler.handleFileUpload(
                    new File([content], filename),
                    'lite'
                );
                
                // Verify content is stored
                expect(appState.chat.activeFile.content).toBe(content);
                
                // Send message
                handler.sendMessage('test message');
                
                // Verify content is attached
                const lastMessage = appState.chat.conversations[0].messages.slice(-1)[0];
                expect(lastMessage.content).toContain(content);
                
                // Verify state is cleared
                expect(appState.chat.activeFile).toBeNull();
            }
        ),
        { numRuns: 100 }
    );
});
```

### 测试覆盖目标

- 后端代码覆盖率：≥ 85%
- 前端代码覆盖率：≥ 80%
- 所有15个属性都有对应的属性测试
- 所有错误处理路径都有单元测试覆盖

