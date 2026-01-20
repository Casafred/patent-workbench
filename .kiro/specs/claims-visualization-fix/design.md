# Design Document

## Overview

本设计文档针对功能七（权利要求处理和可视化）中的四个关键问题提供技术解决方案。这些问题包括：公开号不显示、独权合并内容展示不完全、只显示一条数据、以及堆栈溢出错误。

### 问题根本原因分析

1. **公开号不显示**: 后端在处理权利要求时未正确提取和传递专利号列的数据到ClaimInfo对象
2. **独权合并内容展示不完全**: 前端在合并独立权利要求时使用了字符串截断，且表格单元格样式限制了内容显示
3. **只显示一条数据**: 前端在按专利号分组时可能存在逻辑错误，导致只创建了一个分组
4. **堆栈溢出错误**: 可视化渲染器的`buildChildren`函数存在无限递归问题，未检测循环引用

### 设计目标

- 确保专利号在整个数据流中正确传递（Excel → 后端处理 → API响应 → 前端显示）
- 完整显示所有独立权利要求的合并内容，不截断
- 正确显示所有专利的数据，每个专利一行
- 修复递归调用问题，防止堆栈溢出
- 优化专利号查找逻辑，提高数据检索准确性

## Architecture

### 数据流架构

```
Excel文件 → 后端处理器 → ClaimInfo对象 → API响应 → 前端显示
                ↓
          专利号提取
                ↓
          附加到每个权利要求
```

### 组件交互

1. **ExcelProcessor**: 读取Excel文件，识别专利号列
2. **ProcessingService**: 处理权利要求，提取专利号并附加到ClaimInfo
3. **Claims API**: 返回包含专利号的权利要求数据
4. **前端显示组件**: 按专利号分组并显示数据
5. **可视化渲染器**: 生成权利要求关系图，防止循环引用

## Components and Interfaces

### 1. 后端组件修改

#### ProcessingService 增强

**职责**: 在处理权利要求时提取并附加专利号

**接口修改**:
```python
def process_excel_file(
    file_path: str,
    column_name: str,
    sheet_name: Optional[str] = None,
    patent_column_name: Optional[str] = None  # 新增参数
) -> ProcessedClaims:
    """
    处理Excel文件中的权利要求
    
    Args:
        file_path: Excel文件路径
        column_name: 权利要求列名
        sheet_name: 工作表名称
        patent_column_name: 专利号列名（新增）
    
    Returns:
        ProcessedClaims对象，包含专利号信息
    """
```

**实现逻辑**:
1. 读取Excel文件，获取权利要求列和专利号列数据
2. 对于每个单元格，提取对应行的专利号
3. 在创建ClaimInfo对象时，附加patent_number和row_index属性
4. 确保专利号在整个处理流程中保持一致

#### ClaimInfo 模型扩展

**新增属性**:
```python
@dataclass
class ClaimInfo:
    claim_number: int
    claim_type: str
    claim_text: str
    language: str
    referenced_claims: List[int]
    original_text: str
    confidence_score: float
    patent_number: Optional[str] = None  # 新增
    row_index: Optional[int] = None      # 新增
```

### 2. 前端组件修改

#### showClaimsPatentSummarySection 函数重构


**职责**: 显示所有专利的公开号和合并的独立权利要求

**修复逻辑**:
```javascript
function showClaimsPatentSummarySection(claims) {
    const summaryTbody = document.getElementById('claims_patent_summary_tbody');
    
    // 按专利号分组
    const patentGroups = {};
    claims.forEach(claim => {
        const patentNumber = claim.patent_number || `Row_${claim.row_index || 'Unknown'}`;
        if (!patentGroups[patentNumber]) {
            patentGroups[patentNumber] = [];
        }
        patentGroups[patentNumber].push(claim);
    });
    
    // 清空表格
    summaryTbody.innerHTML = '';
    
    // 为每个专利创建一行
    Object.keys(patentGroups).forEach(patentNumber => {
        const patentClaims = patentGroups[patentNumber];
        const independentClaims = patentClaims.filter(c => c.claim_type === 'independent');
        
        // 完整合并独立权利要求（不截断）
        const mergedText = independentClaims
            .map(c => c.claim_text)
            .join(' ');
        
        const row = summaryTbody.insertRow();
        row.innerHTML = `
            <td>${patentNumber}</td>
            <td class="merged-claims-cell" title="${mergedText}">
                <div class="merged-claims-content">${mergedText}</div>
            </td>
            <td>
                <button class="small-button" onclick="claimsJumpToVisualization('${patentNumber}')">
                    查看引用图
                </button>
            </td>
        `;
    });
}
```

**CSS样式增强**:
```css
.merged-claims-cell {
    max-width: 600px;
    position: relative;
}

.merged-claims-content {
    max-height: 100px;
    overflow-y: auto;
    padding: 5px;
    line-height: 1.4;
}
```

#### claimsFindPatentClaims 函数优化


**职责**: 按专利号查找权利要求，优先使用专利号而非行号

**优化逻辑**:
```javascript
function claimsFindPatentClaims(processedData, patentNumber, rowIndex) {
    // 策略1: 优先按专利号精确匹配
    if (patentNumber && processedData.claims) {
        let patentClaims = processedData.claims.filter(claim => 
            claim.patent_number === patentNumber
        );
        
        if (patentClaims.length > 0) {
            return patentClaims;
        }
        
        // 策略2: 模糊匹配
        patentClaims = processedData.claims.filter(claim => 
            claim.patent_number && claim.patent_number.includes(patentNumber)
        );
        
        if (patentClaims.length > 0) {
            return patentClaims;
        }
    }
    
    // 策略3: 按行号查找（备用）
    if (rowIndex > 0 && processedData.claims_by_row) {
        const claims = processedData.claims_by_row[rowIndex];
        if (claims && claims.length > 0) {
            return claims;
        }
    }
    
    // 策略4: 返回所有权利要求（最后备用）
    return processedData.claims || [];
}
```

#### ClaimsD3TreeRenderer.buildHierarchy 递归修复


**职责**: 构建D3层次结构，防止无限递归

**修复逻辑**:
```javascript
buildHierarchy(data) {
    const independentClaims = data.nodes.filter(node => node.claim_type === 'independent');
    const rootNodes = independentClaims.length > 0 ? independentClaims : data.nodes;
    
    // 使用Set跟踪已访问的节点，防止循环引用
    const buildChildren = (nodeId, visited = new Set(), depth = 0) => {
        // 防止无限递归：检查深度和循环引用
        if (depth > 50) {
            console.warn(`递归深度超过50层，终止递归: ${nodeId}`);
            return null;
        }
        
        if (visited.has(nodeId)) {
            console.warn(`检测到循环引用: ${nodeId}`);
            return null;
        }
        
        // 标记当前节点为已访问
        const newVisited = new Set(visited);
        newVisited.add(nodeId);
        
        const children = data.links
            .filter(link => {
                const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                return sourceId === nodeId;
            })
            .map(link => {
                const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                const childNode = data.nodes.find(node => node.id === targetId);
                
                if (!childNode) return null;
                
                return {
                    ...childNode,
                    children: buildChildren(childNode.id, newVisited, depth + 1)
                };
            })
            .filter(child => child !== null);
        
        return children.length > 0 ? children : null;
    };
    
    // 为每个根节点构建层次结构
    const hierarchyNodes = rootNodes.map(root => ({
        ...root,
        children: buildChildren(root.id, new Set(), 0)
    }));
    
    // 返回D3层次结构
    if (hierarchyNodes.length > 1) {
        return d3.hierarchy({
            id: 'virtual_root',
            claim_number: 'Root',
            claim_type: 'virtual',
            children: hierarchyNodes
        });
    } else if (hierarchyNodes.length === 1) {
        return d3.hierarchy(hierarchyNodes[0]);
    } else {
        return d3.hierarchy({
            id: 'default_root',
            claim_number: '1',
            claim_type: 'independent',
            children: null
        });
    }
}
```

## Data Models

### ClaimInfo 扩展模型


```python
@dataclass
class ClaimInfo:
    """权利要求信息"""
    claim_number: int              # 权利要求序号
    claim_type: str                # 类型: 'independent' 或 'dependent'
    claim_text: str                # 权利要求文本
    language: str                  # 语言代码
    referenced_claims: List[int]   # 引用的权利要求序号列表
    original_text: str             # 原始文本
    confidence_score: float        # 置信度分数
    patent_number: Optional[str] = None  # 专利号（新增）
    row_index: Optional[int] = None      # Excel行索引（新增）
```

### API响应格式

```json
{
    "success": true,
    "data": {
        "summary": {
            "total_cells_processed": 10,
            "total_claims_extracted": 50,
            "independent_claims_count": 5,
            "dependent_claims_count": 45
        },
        "claims": [
            {
                "claim_number": 1,
                "claim_type": "independent",
                "claim_text": "一种...",
                "language": "zh",
                "referenced_claims": [],
                "original_text": "1. 一种...",
                "confidence_score": 0.95,
                "patent_number": "CN202410001234A",
                "row_index": 2
            }
        ],
        "claims_by_row": {
            "2": [
                {
                    "claim_number": 1,
                    "patent_number": "CN202410001234A",
                    ...
                }
            ]
        }
    }
}
```

### 前端数据结构

```javascript
// 专利分组结构
const patentGroups = {
    "CN202410001234A": [
        { claim_number: 1, claim_type: "independent", ... },
        { claim_number: 2, claim_type: "dependent", ... }
    ],
    "US202402107869A1": [
        { claim_number: 1, claim_type: "independent", ... }
    ]
};

// 可视化数据结构
const visualizationData = {
    patent_number: "CN202410001234A",
    nodes: [
        {
            id: "claim_1",
            claim_number: 1,
            claim_type: "independent",
            claim_text: "...",
            dependencies: []
        }
    ],
    links: [
        {
            source: "claim_1",
            target: "claim_2",
            type: "dependency"
        }
    ]
};
```

## Correctness Properties

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

现在我需要使用prework工具来分析需求中的验收标准：


### Property Reflection

在生成属性之前，我需要审查所有可测试的属性，识别并消除冗余：

**冗余分析**:
1. 属性1.2（附加专利号到对象）和属性6.1（ClaimInfo包含patent_number）是重复的 → 合并为一个属性
2. 属性1.3（显示专利号）和属性3.2（为每个专利创建一行）可以合并 → 合并为一个综合属性
3. 属性2.1（提取独立权利要求）和属性2.2（合并文本）可以合并 → 合并为一个属性
4. 属性4.2（维护已访问节点集合）是属性4.1（检测循环引用）的实现细节 → 移除4.2
5. 属性5.1（精确匹配）、5.2（模糊匹配）、5.4（行号查找）描述了查找策略的优先级 → 合并为一个属性
6. 属性6.2（JSON导出）、6.3（API响应）、6.5（可视化数据）都是关于数据传递中保留patent_number → 合并为一个属性

**保留的唯一属性**:
- 专利号提取和附加（合并1.1, 1.2, 6.1）
- 专利分组和显示（合并1.5, 3.1, 3.2, 3.3）
- 独立权利要求合并（合并2.1, 2.2, 2.3）
- 循环引用检测（4.1）
- 递归深度限制（4.4）
- 引用验证（4.5）
- 查找策略优先级（合并5.1, 5.2, 5.3, 5.4）
- 数据结构一致性（合并6.2, 6.3, 6.4, 6.5）

### Correctness Properties

Property 1: 专利号提取和附加
*For any* Excel文件包含权利要求和专利号列，当系统处理该文件时，每个生成的ClaimInfo对象应该包含对应行的patent_number值
**Validates: Requirements 1.1, 1.2, 6.1**

Property 2: 专利分组完整性
*For any* 权利要求集合，当系统按专利号分组时，分组数量应该等于唯一专利号的数量，且每个专利的所有权利要求都应该在对应的分组中
**Validates: Requirements 1.5, 3.1, 3.2, 3.3, 3.4**

Property 3: 独立权利要求合并完整性
*For any* 专利的独立权利要求集合，合并后的文本应该包含所有独立权利要求的完整文本，用空格连接，且不应该被截断
**Validates: Requirements 2.1, 2.2, 2.3**

Property 4: 循环引用检测
*For any* 包含循环引用的权利要求依赖关系图，可视化渲染器应该检测到循环并终止递归，不应该导致堆栈溢出
**Validates: Requirements 4.1, 4.3**

Property 5: 递归深度限制
*For any* 权利要求依赖关系图，可视化渲染器构建层次结构时的递归深度不应该超过50层
**Validates: Requirements 4.4**

Property 6: 引用有效性验证
*For any* 权利要求引用关系，被引用的权利要求应该存在于数据集中，且引用关系不应该形成循环
**Validates: Requirements 4.5**

Property 7: 查找策略优先级
*For any* 专利号查询，系统应该按以下优先级查找：1) 精确匹配专利号 2) 模糊匹配专利号 3) 按行号查找，且应该返回找到的所有权利要求
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

Property 8: 数据传递一致性
*For any* 权利要求数据在系统中传递（后端处理 → JSON序列化 → API响应 → 前端接收 → 可视化构建），patent_number字段应该在所有阶段保持存在且值一致
**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

Property 9: 公开号显示完整性
*For any* 处理后的权利要求数据，公开号与独权合并视窗应该为每个唯一专利号显示一行，包含专利号和合并的独立权利要求内容
**Validates: Requirements 1.3, 3.5**

## Error Handling

### 专利号缺失处理


**场景**: Excel文件中没有专利号列或专利号列未被识别

**处理策略**:
1. 使用行索引作为备用标识符：`Row_${row_index}`
2. 在UI中显示警告消息，提示用户专利号不可用
3. 仍然允许用户查看和可视化权利要求数据

**实现**:
```python
# 后端
patent_number = patent_data[row_index] if patent_column_name and patent_data else f"Row_{row_index}"
```

```javascript
// 前端
const patentNumber = claim.patent_number || `Row_${claim.row_index || 'Unknown'}`;
```

### 循环引用处理

**场景**: 权利要求之间存在循环依赖关系

**处理策略**:
1. 在递归构建层次结构时维护已访问节点集合
2. 检测到循环引用时立即终止该分支的递归
3. 记录警告日志，包含循环路径信息
4. 继续处理其他非循环分支

**实现**:
```javascript
const buildChildren = (nodeId, visited = new Set(), depth = 0) => {
    if (depth > 50) {
        console.warn(`递归深度超过50层，终止递归: ${nodeId}`);
        return null;
    }
    
    if (visited.has(nodeId)) {
        console.warn(`检测到循环引用: ${nodeId}`);
        return null;
    }
    
    const newVisited = new Set(visited);
    newVisited.add(nodeId);
    
    // 继续递归...
};
```

### 数据查找失败处理

**场景**: 按专利号或行号查找权利要求失败

**处理策略**:
1. 尝试多种查找策略（精确匹配 → 模糊匹配 → 行号查找）
2. 如果所有策略都失败，显示清晰的错误消息
3. 提供建议操作（检查输入、尝试其他关键词等）
4. 不崩溃，允许用户重新尝试

**实现**:
```javascript
if (patentClaims.length === 0) {
    showClaimsMessage(
        '未找到包含 "' + query + '" 的专利号。建议：' +
        '1) 检查输入是否正确 ' +
        '2) 尝试输入更少的字符 ' +
        '3) 确认Excel中包含专利号数据',
        'error'
    );
    displayClaimsSearchResults([], query);
}
```

### 独立权利要求缺失处理

**场景**: 某个专利没有独立权利要求

**处理策略**:
1. 在合并视窗中显示该专利，但合并内容显示为"无独立权利要求"
2. 仍然允许查看该专利的从属权利要求
3. 在可视化中显示所有从属权利要求，但没有根节点

**实现**:
```javascript
const independentClaims = patentClaims.filter(c => c.claim_type === 'independent');
const mergedText = independentClaims.length > 0 
    ? independentClaims.map(c => c.claim_text).join(' ')
    : '无独立权利要求';
```

## Testing Strategy

### 双重测试方法

本项目采用单元测试和属性测试相结合的方法：

**单元测试**:
- 专注于特定示例和边缘情况
- 测试错误条件和异常处理
- 验证UI交互和用户体验
- 测试集成点和API端点

**属性测试**:
- 验证通用属性在所有输入下都成立
- 通过随机化实现全面的输入覆盖
- 每个属性测试至少运行100次迭代
- 标记格式：**Feature: claims-visualization-fix, Property {number}: {property_text}**

### 测试配置

**属性测试库**: 
- Python后端: Hypothesis
- JavaScript前端: fast-check

**最小迭代次数**: 100次/属性测试

**测试标记示例**:
```python
# Feature: claims-visualization-fix, Property 1: 专利号提取和附加
@given(excel_file=excel_with_claims_and_patent_numbers())
def test_patent_number_extraction(excel_file):
    result = process_excel_file(excel_file)
    for claim in result.claims_data:
        assert claim.patent_number is not None
```

```javascript
// Feature: claims-visualization-fix, Property 4: 循环引用检测
fc.assert(
    fc.property(
        fc.array(claimNodeArbitrary()),
        fc.array(claimLinkArbitrary()),
        (nodes, links) => {
            const data = { nodes, links };
            const renderer = new ClaimsD3TreeRenderer('test-container');
            // 应该不抛出堆栈溢出错误
            expect(() => renderer.buildHierarchy(data)).not.toThrow();
        }
    ),
    { numRuns: 100 }
);
```

### 单元测试重点

1. **专利号提取**:
   - 测试有专利号列的情况
   - 测试无专利号列的情况（使用行索引）
   - 测试专利号列为空的情况

2. **分组逻辑**:
   - 测试单个专利的情况
   - 测试多个专利的情况
   - 测试重复专利号的情况

3. **文本合并**:
   - 测试单个独立权利要求
   - 测试多个独立权利要求
   - 测试无独立权利要求的情况

4. **循环检测**:
   - 测试简单循环（A → B → A）
   - 测试复杂循环（A → B → C → A）
   - 测试自引用（A → A）

5. **查找策略**:
   - 测试精确匹配成功
   - 测试模糊匹配成功
   - 测试行号查找成功
   - 测试所有方法失败

### 集成测试

1. **端到端流程**:
   - 上传Excel → 处理 → 显示公开号视窗 → 查看可视化
   - 验证专利号在整个流程中正确传递

2. **API测试**:
   - 测试/api/claims/process端点返回包含patent_number的数据
   - 测试/api/claims/result端点返回正确的分组数据

3. **UI测试**:
   - 测试公开号与独权合并视窗显示所有专利
   - 测试点击"查看引用图"按钮不崩溃
   - 测试可视化图表正确渲染

## Implementation Notes

### 关键修改点

1. **backend/routes/claims.py**:
   - 修改`process_claims`函数，接受`patent_column_name`参数
   - 在处理过程中提取专利号并附加到ClaimInfo对象

2. **patent_claims_processor/services/processing_service.py**:
   - 修改`process_excel_file`方法，添加专利号提取逻辑
   - 确保专利号在整个处理流程中保持一致

3. **js/claimsProcessorIntegrated.js**:
   - 修改`showClaimsPatentSummarySection`函数，正确分组和显示所有专利
   - 修改`claimsFindPatentClaims`函数，优化查找策略
   - 修改`ClaimsD3TreeRenderer.buildHierarchy`方法，添加循环检测和深度限制

4. **CSS样式**:
   - 添加`.merged-claims-cell`和`.merged-claims-content`样式
   - 确保合并内容可以滚动查看

### 性能考虑

1. **大数据集处理**:
   - 对于包含大量专利的Excel文件，分组操作应该高效
   - 使用Map或对象进行O(1)查找，避免嵌套循环

2. **可视化渲染**:
   - 对于复杂的权利要求关系图，限制递归深度避免性能问题
   - 使用D3.js的虚拟化技术处理大量节点

3. **内存管理**:
   - 在递归过程中使用Set跟踪已访问节点，避免内存泄漏
   - 及时清理不再使用的DOM元素和事件监听器

### 向后兼容性

1. **可选参数**:
   - `patent_column_name`参数设为可选，不影响现有功能
   - 如果未提供专利号列，使用行索引作为备用

2. **数据格式**:
   - 新增的`patent_number`和`row_index`字段为可选
   - 旧版本的数据仍然可以正常处理

3. **API响应**:
   - 保持现有响应格式，新增字段不影响旧客户端
