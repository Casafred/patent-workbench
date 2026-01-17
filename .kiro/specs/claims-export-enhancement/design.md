# Design Document: Claims Export Enhancement

## Overview

本设计文档描述了专利权利要求处理器导出功能增强的技术实现方案。该功能包括两个主要部分：

1. **修复报告查看功能** - 解决前端模态框显示问题
2. **添加独立权利要求汇总工作表** - 在Excel导出中新增汇总表，包含结构化的引用关系数据

设计遵循现有的Flask后端架构和前端JavaScript模式，确保与现有代码库的兼容性。

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │ claimsProcessor.js│────────▶│  Report Modal Component │  │
│  │  - viewReport()   │         │  - showReportModal()    │  │
│  └──────────────────┘         └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Request
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend Layer                         │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │  Flask Routes    │────────▶│   Export Service        │  │
│  │  /export         │         │  - generate_excel()     │  │
│  └──────────────────┘         │  - create_summary_sheet()│ │
│                                └─────────────────────────┘  │
│                                          │                   │
│                                          ▼                   │
│                                ┌─────────────────────────┐  │
│                                │   Claims Parser         │  │
│                                │  - classify_claim()     │  │
│                                │  - extract_references() │  │
│                                └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │ Excel File   │
                        │ (.xlsx)      │
                        └──────────────┘
```

### Data Flow

1. **报告查看流程**:
   - 用户点击"查看报告"按钮
   - 前端调用 `viewReport()` 函数
   - 从存储中获取报告数据
   - 调用 `showReportModal()` 显示模态框

2. **Excel导出流程**:
   - 用户点击"导出Excel"按钮
   - 前端发送POST请求到 `/export` 端点
   - 后端调用 `generate_excel()` 生成Excel文件
   - 创建"独立权利要求汇总"工作表
   - 解析权利要求并提取引用关系
   - 返回Excel文件作为HTTP响应

## Components and Interfaces

### 1. Frontend: Report Modal Fix

**文件**: `frontend/js/claimsProcessor.js`

**修复内容**:
- 确保 `viewReport()` 函数正确获取报告数据
- 修复 `showReportModal()` 函数的DOM操作
- 添加错误处理和用户反馈

**关键函数**:

```javascript
function viewReport(taskId) {
    // 从localStorage或sessionStorage获取报告数据
    const reportData = getReportData(taskId);
    
    if (!reportData) {
        showError("无法加载报告数据");
        return;
    }
    
    // 显示模态框
    showReportModal(reportData);
}

function showReportModal(reportData) {
    // 创建或获取模态框元素
    const modal = document.getElementById('reportModal') || createReportModal();
    
    // 填充报告内容
    populateReportContent(modal, reportData);
    
    // 显示模态框
    modal.style.display = 'block';
    
    // 添加关闭事件监听器
    setupModalCloseHandlers(modal);
}

function populateReportContent(modal, reportData) {
    // 填充各个报告字段
    modal.querySelector('.total-claims').textContent = reportData.totalClaims;
    modal.querySelector('.independent-claims').textContent = reportData.independentClaims;
    modal.querySelector('.dependent-claims').textContent = reportData.dependentClaims;
    // ... 其他字段
}
```

### 2. Backend: Export Service Enhancement

**文件**: `backend/services/export_service.py`

**新增函数**: `create_summary_sheet()`

**函数签名**:
```python
def create_summary_sheet(workbook, processed_data):
    """
    创建独立权利要求汇总工作表
    
    Args:
        workbook: openpyxl Workbook对象
        processed_data: 处理后的权利要求数据列表
        
    Returns:
        worksheet: 创建的工作表对象
    """
```

**实现逻辑**:

```python
def create_summary_sheet(workbook, processed_data):
    # 创建新工作表
    ws = workbook.create_sheet("独立权利要求汇总", 0)
    
    # 设置列标题
    headers = ["原数据行号", "独立权利要求序号", "独立权利要求文本", "从属权利要求引用关系"]
    ws.append(headers)
    
    # 遍历处理后的数据
    for row_idx, row_data in enumerate(processed_data, start=2):
        # 提取独立权利要求
        independent_claims = extract_independent_claims(row_data)
        
        if not independent_claims:
            continue
        
        # 提取引用关系
        reference_map = build_reference_map(row_data)
        
        # 合并独立权利要求序号
        claim_numbers = ", ".join([str(c['number']) for c in independent_claims])
        
        # 合并独立权利要求文本
        claim_texts = "\n\n".join([c['text'] for c in independent_claims])
        
        # 转换引用关系为JSON
        reference_json = json.dumps(reference_map, ensure_ascii=False)
        
        # 添加数据行
        ws.append([row_idx, claim_numbers, claim_texts, reference_json])
    
    # 设置列宽
    ws.column_dimensions['A'].width = 15
    ws.column_dimensions['B'].width = 20
    ws.column_dimensions['C'].width = 60
    ws.column_dimensions['D'].width = 40
    
    # 设置样式
    apply_header_style(ws)
    
    return ws
```

### 3. Claims Parser Enhancement

**文件**: `backend/processors/claims_parser.py`

**新增辅助函数**:

```python
def extract_independent_claims(row_data):
    """
    从行数据中提取所有独立权利要求
    
    Args:
        row_data: 包含权利要求信息的字典
        
    Returns:
        list: 独立权利要求列表，每项包含 {'number': int, 'text': str}
    """
    independent_claims = []
    
    if 'claims' not in row_data:
        return independent_claims
    
    for claim in row_data['claims']:
        if claim.get('type') == 'independent':
            independent_claims.append({
                'number': claim['number'],
                'text': claim['text']
            })
    
    return independent_claims

def build_reference_map(row_data):
    """
    构建从属权利要求的引用关系映射
    
    Args:
        row_data: 包含权利要求信息的字典
        
    Returns:
        dict: 引用关系映射 {从属序号: [被引用序号列表]}
    """
    reference_map = {}
    
    if 'claims' not in row_data:
        return reference_map
    
    for claim in row_data['claims']:
        if claim.get('type') == 'dependent':
            claim_number = claim['number']
            referenced = claim.get('referenced_claims', [])
            if referenced:
                reference_map[str(claim_number)] = referenced
    
    return reference_map
```

## Data Models

### Report Data Structure

```python
{
    "taskId": str,              # 任务ID
    "totalClaims": int,         # 总权利要求数
    "independentClaims": int,   # 独立权利要求数
    "dependentClaims": int,     # 从属权利要求数
    "processingTime": float,    # 处理时间（秒）
    "errors": list,             # 错误列表
    "timestamp": str            # 时间戳
}
```

### Processed Row Data Structure

```python
{
    "row_number": int,          # 原始行号
    "claims": [                 # 权利要求列表
        {
            "number": int,      # 权利要求序号
            "text": str,        # 权利要求文本
            "type": str,        # "independent" 或 "dependent"
            "referenced_claims": [int]  # 被引用的权利要求序号列表
        }
    ]
}
```

### Summary Sheet Row Structure

```python
{
    "original_row_number": int,     # 原数据行号
    "claim_numbers": str,           # 独立权利要求序号（逗号分隔）
    "claim_texts": str,             # 独立权利要求文本（换行分隔）
    "reference_relationships": str  # JSON格式的引用关系
}
```

### Reference Relationship JSON Format

```json
{
    "2": [1],           // 权利要求2引用权利要求1
    "3": [1, 2],        // 权利要求3引用权利要求1和2
    "4": [1],           // 权利要求4引用权利要求1
    "5": [2, 3]         // 权利要求5引用权利要求2和3
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: 报告模态框正确渲染所有字段
*For any* 有效的报告数据，当打开报告模态框时，模态框应该显示并且所有必需的数据字段（总权利要求数、独立权利要求数、从属权利要求数等）都应该被正确渲染到对应的DOM元素中。
**Validates: Requirements 1.1, 1.3**

### Property 2: 报告加载失败时显示错误消息
*For any* 无效或缺失的报告数据，当尝试查看报告时，系统应该显示清晰的错误消息并且界面应该保持稳定（不崩溃）。
**Validates: Requirements 1.2**

### Property 3: 模态框关闭后正确清理状态
*For any* 打开的报告模态框，当用户关闭模态框时，模态框的display属性应该被设置为'none'，并且事件监听器应该被移除。
**Validates: Requirements 1.4**

### Property 4: Excel文件包含汇总工作表
*For any* 有效的导出请求，生成的Excel文件应该包含名为"独立权利要求汇总"的工作表，并且该工作表应该是第一个工作表（索引0）。
**Validates: Requirements 2.1, 2.5**

### Property 5: 汇总工作表包含正确的列标题
*For any* 生成的汇总工作表，第一行应该包含且仅包含这四个列标题："原数据行号"、"独立权利要求序号"、"独立权利要求文本"、"从属权利要求引用关系"，顺序一致。
**Validates: Requirements 2.2**

### Property 6: 仅为包含独立权利要求的行生成汇总记录
*For any* 原始数据行，当且仅当该行包含至少一个独立权利要求时，汇总工作表中应该存在对应的记录；如果该行不包含独立权利要求，则汇总表中不应该有对应记录。
**Validates: Requirements 2.3, 2.4**

### Property 7: 正确提取独立权利要求数据
*For any* 包含独立权利要求的数据行，提取的权利要求序号应该与原始数据中的序号匹配，提取的文本应该与原始文本完全一致（保留所有字符和格式）。
**Validates: Requirements 3.1, 3.2**

### Property 8: 多个独立权利要求的序号格式化
*For any* 包含多个独立权利要求的数据行，汇总表中的"独立权利要求序号"列应该包含所有序号，用", "（逗号加空格）分隔。
**Validates: Requirements 3.3**

### Property 9: 多个独立权利要求的文本格式化
*For any* 包含多个独立权利要求的数据行，汇总表中的"独立权利要求文本"列应该包含所有文本，用"\n\n"（两个换行符）分隔。
**Validates: Requirements 3.4**

### Property 10: 引用关系JSON有效性（Round-trip）
*For any* 生成的引用关系数据，该数据应该是有效的JSON字符串，并且使用json.loads()解析后再使用json.dumps()序列化应该产生等价的JSON结构。
**Validates: Requirements 4.1, 4.5**

### Property 11: 引用关系完整记录
*For any* 从属权利要求，引用关系JSON中应该包含该从属权利要求的序号作为键，其值应该是一个列表，包含所有被引用的权利要求序号。
**Validates: Requirements 4.2, 4.3**

### Property 12: 原数据行号正确记录
*For any* 汇总表中的记录，"原数据行号"列的值应该与该记录对应的原始数据在Excel文件中的行号一致（考虑标题行，数据从第2行开始）。
**Validates: Requirements 5.1, 5.2**

### Property 13: 同源记录的行号一致性
*For any* 来自同一原始数据行的多个汇总记录（当一行包含多个独立权利要求时），这些记录的"原数据行号"应该完全相同。
**Validates: Requirements 5.3**

### Property 14: 保留所有现有工作表
*For any* 导出操作，生成的Excel文件应该包含"独立权利要求汇总"、"权利要求详情"、"处理统计"和"错误报告"这四个工作表。
**Validates: Requirements 6.1**

### Property 15: 导出错误时返回错误响应
*For any* 导致导出失败的输入或系统错误，系统应该返回HTTP错误响应（4xx或5xx），响应体应该包含错误信息，而不是崩溃或返回损坏的文件。
**Validates: Requirements 6.2**

### Property 16: 正确的HTTP响应头
*For any* 成功的导出请求，HTTP响应应该包含Content-Type为"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"，并且Content-Disposition头应该包含文件名。
**Validates: Requirements 6.4**

### Property 17: 解析错误时继续处理
*For any* 包含部分无效权利要求数据的输入，系统应该处理所有有效的行，记录无效行的错误，并且生成的汇总表应该包含所有成功处理的行。
**Validates: Requirements 7.2**

### Property 18: 引用关系错误时使用默认值
*For any* 引用关系数据格式错误或缺失的情况，汇总表中对应的"从属权利要求引用关系"列应该包含空JSON对象"{}"。
**Validates: Requirements 7.3**

## Error Handling

### Frontend Error Handling

1. **报告数据缺失**:
   - 检查localStorage/sessionStorage中是否存在报告数据
   - 如果不存在，显示友好的错误消息："无法加载报告数据，请重新处理文件"
   - 不尝试显示模态框

2. **DOM元素缺失**:
   - 在操作DOM前检查元素是否存在
   - 如果模态框元素不存在，动态创建
   - 添加try-catch包裹DOM操作

3. **数据格式错误**:
   - 验证报告数据结构
   - 对缺失的字段使用默认值（如0或"N/A"）
   - 记录警告到console

### Backend Error Handling

1. **数据解析错误**:
   - 使用try-except包裹权利要求解析逻辑
   - 记录错误到日志系统
   - 继续处理其他行，不中断整个导出过程

2. **Excel写入错误**:
   - 捕获openpyxl的异常
   - 返回HTTP 500响应，包含错误详情
   - 清理临时文件

3. **内存不足**:
   - 对大文件使用流式处理
   - 分批处理数据行
   - 设置合理的文件大小限制

4. **JSON序列化错误**:
   - 使用ensure_ascii=False处理Unicode字符
   - 对无法序列化的对象使用默认值
   - 记录警告并继续

### Error Response Format

```python
{
    "error": True,
    "message": "导出失败：无法解析权利要求数据",
    "details": "第5行：权利要求格式不正确",
    "code": "EXPORT_PARSE_ERROR"
}
```

## Testing Strategy

本功能采用双重测试策略，结合单元测试和基于属性的测试（Property-Based Testing）来确保全面的代码覆盖和正确性验证。

### Unit Testing

单元测试专注于具体的示例、边缘情况和错误条件：

**Frontend Tests** (使用Jest或类似框架):
- 测试报告模态框的创建和显示
- 测试特定的报告数据格式
- 测试模态框关闭和清理
- 测试错误消息显示

**Backend Tests** (使用pytest):
- 测试空数据情况（Requirement 7.1）
- 测试标题行计数（Requirement 5.2）
- 测试文件写入失败（Requirement 7.4）
- 测试特定的引用关系格式
- 测试Excel文件结构

### Property-Based Testing

基于属性的测试验证跨所有输入的通用属性。使用**Hypothesis**库（Python）进行property-based testing。

**配置要求**:
- 每个property test最少运行100次迭代
- 每个测试必须引用设计文档中的property
- 标签格式：`# Feature: claims-export-enhancement, Property N: [property text]`

**测试覆盖**:

1. **Property 1-3**: 前端报告查看功能
   - 生成随机报告数据结构
   - 验证模态框渲染和错误处理

2. **Property 4-6**: 汇总工作表创建和过滤
   - 生成随机的权利要求数据集
   - 验证工作表结构和数据过滤逻辑

3. **Property 7-9**: 数据提取和格式化
   - 生成包含各种权利要求组合的数据
   - 验证序号和文本的正确提取和格式化

4. **Property 10-11**: 引用关系JSON
   - 生成随机的引用关系结构
   - 验证JSON有效性和完整性（round-trip property）

5. **Property 12-13**: 行号追溯
   - 生成不同大小的数据集
   - 验证行号的正确性和一致性

6. **Property 14-16**: Excel导出完整性
   - 生成各种数据组合
   - 验证工作表存在性和HTTP响应

7. **Property 17-18**: 错误处理
   - 生成包含错误的数据
   - 验证错误恢复和默认值

**示例Property Test**:

```python
from hypothesis import given, strategies as st
import json

@given(st.lists(st.dictionaries(
    keys=st.text(min_size=1),
    values=st.lists(st.integers(min_value=1, max_value=100))
)))
def test_reference_json_roundtrip(reference_map):
    """
    Feature: claims-export-enhancement, Property 10: 引用关系JSON有效性（Round-trip）
    
    验证生成的引用关系JSON可以被解析并还原
    """
    # 生成JSON字符串
    json_str = json.dumps(reference_map, ensure_ascii=False)
    
    # 解析JSON
    parsed = json.loads(json_str)
    
    # 再次序列化
    json_str2 = json.dumps(parsed, ensure_ascii=False)
    
    # 验证round-trip
    assert json.loads(json_str) == json.loads(json_str2)
```

### Integration Testing

集成测试验证端到端流程：
- 上传Excel文件 → 处理 → 导出 → 验证生成的Excel文件
- 测试完整的报告查看流程
- 测试多用户并发导出

### Test Coverage Goals

- 单元测试代码覆盖率：≥ 85%
- Property-based测试：所有18个properties都有对应的测试
- 集成测试：覆盖所有主要用户流程

## Implementation Notes

### Performance Considerations

1. **大文件处理**:
   - 对超过1000行的数据使用分批处理
   - 考虑使用openpyxl的write_only模式

2. **内存优化**:
   - 及时释放不再使用的数据结构
   - 使用生成器处理大数据集

3. **前端性能**:
   - 使用虚拟滚动显示大量报告数据
   - 延迟加载模态框内容

### Security Considerations

1. **输入验证**:
   - 验证上传文件的大小和格式
   - 清理用户输入的文本数据

2. **XSS防护**:
   - 在渲染报告数据前进行HTML转义
   - 使用textContent而不是innerHTML

3. **文件访问控制**:
   - 验证用户权限
   - 使用临时文件并及时清理

### Backward Compatibility

- 保持现有API接口不变
- 新增的汇总工作表不影响现有工作表的读取
- 前端代码向后兼容，不破坏现有功能

### Future Enhancements

1. **可视化树状图**:
   - 使用引用关系JSON数据
   - 集成D3.js或类似库
   - 提供交互式权利要求关系图

2. **导出格式扩展**:
   - 支持PDF导出
   - 支持CSV导出
   - 支持自定义模板

3. **高级过滤**:
   - 按权利要求类型过滤
   - 按引用深度过滤
   - 自定义汇总规则
