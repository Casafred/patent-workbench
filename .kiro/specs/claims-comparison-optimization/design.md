# 功能五：权利要求对比功能优化设计方案

## 1. 整体架构设计

### 1.1 前端架构
```
功能五界面
├── 配置区
│   ├── 模型选择器
│   └── 对比模式选择（2/3/4个权利要求）
├── 输入区（动态2-4个）
│   ├── 版本标识
│   ├── 权利要求全文输入
│   └── 独立权利要求序号
├── 分析按钮
└── 结果展示区
    ├── 视图切换器（卡片/并排/矩阵/图表）
    ├── 差异统计面板
    └── 详细对比内容
```

### 1.2 数据流设计
```
用户输入 → 提取权利要求 → 语言检测 → 翻译（如需）→ 
多权利要求对比分析 → 结果处理 → 可视化渲染
```

## 2. 详细设计

### 2.1 模型选择器设计

#### UI设计
```html
<div class="model-selector-container">
  <label for="comparison_model_select">选择对比模型：</label>
  <select id="comparison_model_select">
    <option value="GLM-4.7-Flash" selected>GLM-4.7-Flash（快速）</option>
    <option value="glm-4-flash">glm-4-flash（标准）</option>
    <option value="glm-4-long">glm-4-long（深度）</option>
  </select>
  <div class="model-info">
    <span id="model_description">快速模型，适合简单对比，响应速度快</span>
  </div>
</div>
```

#### 模型特性说明
- **GLM-4.7-Flash**：速度最快，适合2-3个权利要求的快速对比
- **glm-4-flash**：平衡性能，适合3-4个权利要求的标准对比
- **glm-4-long**：深度分析，适合复杂技术特征的详细对比

### 2.2 多权利要求输入区设计

#### 动态输入组件
```javascript
// 状态管理
appState.claimsComparison = {
  model: 'GLM-4.7-Flash',
  comparisonCount: 2, // 2-4
  claims: [
    { id: 1, label: '版本A', fullText: '', numbers: '', original: '', translated: '', lang: '' },
    { id: 2, label: '版本B', fullText: '', numbers: '', original: '', translated: '', lang: '' }
  ],
  analysisResult: null,
  viewMode: 'card', // card, sideBySide, matrix, chart
  displayLang: 'translated'
}
```

#### UI布局
```html
<div class="comparison-count-selector">
  <label>对比数量：</label>
  <button class="count-btn active" data-count="2">2个</button>
  <button class="count-btn" data-count="3">3个</button>
  <button class="count-btn" data-count="4">4个</button>
</div>

<div id="claims_input_container">
  <!-- 动态生成2-4个输入组 -->
</div>
```

### 2.3 对比分析API设计

#### 请求格式
```javascript
{
  model: 'GLM-4.7-Flash',
  claims: [
    { id: 1, label: '版本A', text: '...' },
    { id: 2, label: '版本B', text: '...' },
    { id: 3, label: '版本C', text: '...' }
  ]
}
```

#### 响应格式
```javascript
{
  comparison_matrix: [
    {
      claim_ids: [1, 2],
      similar_features: [...],
      different_features: [...],
      similarity_score: 0.75
    },
    {
      claim_ids: [1, 3],
      similar_features: [...],
      different_features: [...],
      similarity_score: 0.60
    },
    {
      claim_ids: [2, 3],
      similar_features: [...],
      different_features: [...],
      similarity_score: 0.55
    }
  ],
  overall_analysis: {
    common_features: [...],
    unique_features: {
      '1': [...],
      '2': [...],
      '3': [...]
    },
    evolution_summary: '...'
  }
}
```

### 2.4 可视化设计

#### 2.4.1 卡片视图（默认）
- 每对权利要求一张卡片
- 显示相同特征和差异特征
- 相似度评分
- 支持展开/折叠

#### 2.4.2 并排对比视图
```html
<div class="side-by-side-view">
  <div class="comparison-header">
    <div class="claim-label">版本A</div>
    <div class="claim-label">版本B</div>
    <div class="claim-label">版本C</div>
  </div>
  <div class="comparison-body">
    <!-- 同步滚动的文本区域，差异部分高亮 -->
  </div>
</div>
```

#### 2.4.3 矩阵对比视图
```
        版本A    版本B    版本C    版本D
版本A     -      75%      60%      50%
版本B    75%      -       55%      45%
版本C    60%     55%       -       70%
版本D    50%     45%      70%       -
```

#### 2.4.4 图表视图
- **雷达图**：展示各技术维度的差异
- **韦恩图**：展示特征交集
- **柱状图**：展示各版本的特征数量对比

### 2.5 差异高亮算法

#### 文本差异检测
```javascript
function highlightDifferences(texts) {
  // 1. 分词/分句
  const segments = texts.map(text => segmentText(text));
  
  // 2. 计算相似度矩阵
  const similarityMatrix = calculateSimilarityMatrix(segments);
  
  // 3. 识别差异部分
  const differences = identifyDifferences(segments, similarityMatrix);
  
  // 4. 生成高亮HTML
  return generateHighlightedHTML(texts, differences);
}
```

#### 高亮样式
```css
.text-added { background-color: #d4edda; color: #155724; }
.text-removed { background-color: #f8d7da; color: #721c24; }
.text-modified { background-color: #fff3cd; color: #856404; }
.text-same { color: #6c757d; opacity: 0.7; }
```

### 2.6 导出功能设计

#### 导出选项
```javascript
const exportOptions = {
  pdf: {
    title: '权利要求对比报告',
    sections: ['统计', '详细对比', '图表'],
    template: 'professional'
  },
  excel: {
    sheets: ['对比矩阵', '相同特征', '差异特征'],
    format: 'table'
  },
  image: {
    format: 'png',
    quality: 0.95,
    sections: ['图表', '矩阵']
  }
}
```

## 3. 技术实现要点

### 3.1 性能优化
- 使用虚拟滚动处理大文本
- 差异计算使用Web Worker
- 结果缓存，避免重复计算
- 懒加载图表组件

### 3.2 响应式设计
- 移动端：垂直堆叠布局
- 平板：2列布局
- 桌面：3-4列布局

### 3.3 可访问性
- 键盘导航支持
- 屏幕阅读器友好
- 高对比度模式
- 字体大小可调

## 4. 实现步骤

### Phase 1: 基础功能（P0）
1. 添加模型选择器
2. 实现动态输入区（2-4个）
3. 修改对比API支持多权利要求
4. 实现基础差异高亮
5. 更新卡片视图

### Phase 2: 增强功能（P1）
1. 实现并排对比视图
2. 添加差异统计面板
3. 实现矩阵对比视图
4. 添加导出功能（PDF/Excel）

### Phase 3: 高级功能（P2）
1. 实现图表视图
2. 添加历史记录
3. 实现收藏功能
4. 优化性能和用户体验

## 5. 测试计划

### 5.1 功能测试
- 2/3/4个权利要求对比
- 不同模型的对比结果
- 多语言支持
- 导出功能

### 5.2 性能测试
- 大文本处理（>10000字）
- 多权利要求同时对比
- 并发请求处理

### 5.3 兼容性测试
- Chrome/Firefox/Safari/Edge
- Windows/Mac/Linux
- 移动端浏览器

## 6. 风险评估

### 6.1 技术风险
- **风险**：多权利要求对比可能导致API响应时间过长
- **缓解**：使用流式响应，分步展示结果

### 6.2 用户体验风险
- **风险**：界面过于复杂，用户学习成本高
- **缓解**：提供引导教程和示例数据

### 6.3 性能风险
- **风险**：大量文本对比可能导致浏览器卡顿
- **缓解**：使用Web Worker和虚拟滚动
