# 功能六UI增强 - 字段选择器和事件时间轴

## 📅 更新时间
2026-02-03

## 🎯 新增功能

### 1. **字段选择器** (Field Selector)
允许用户在批量爬取时自定义选择要爬取的字段，优化性能和用户体验。

### 2. **事件时间轴** (Event Timeline)
以可视化时间轴形式展示专利的完整生命周期事件。

---

## ✨ 功能一：字段选择器

### 设计理念
- **基础字段必选**：专利号、标题、摘要等核心信息默认选中且不可取消
- **可选字段灵活**：用户可根据需求选择额外字段
- **性能提示**：标注耗时字段，帮助用户权衡

### 字段分类

#### 📋 基础信息（必选，8个字段）
- ✅ 专利号
- ✅ 标题
- ✅ 摘要
- ✅ 发明人
- ✅ 申请人
- ✅ 申请日期
- ✅ 公开日期
- ✅ 权利要求

#### 🏷️ 分类与领域（可选，3个字段）
- ☑️ CPC分类 `推荐`
- ☑️ 技术领域 `推荐`
- ☑️ 优先权日期

#### 👨‍👩‍👧‍👦 同族信息（可选，3个字段）
- ☐ 同族ID
- ☐ 同族申请 `耗时`
- ☐ 国家状态

#### 📚 引用信息（可选，2个字段）
- ☐ 引用专利
- ☐ 被引用专利 `耗时`

#### ⚖️ 法律与事件（可选，2个字段）
- ☐ 法律事件 `推荐`
- ☐ 外部链接

#### 📄 附加内容（可选，3个字段）
- ☐ 说明书 `耗时`
- ☐ 附图
- ☐ 相似文档

### 快捷操作
1. **全选可选** - 选择所有可选字段
2. **取消全选** - 取消所有可选字段
3. **推荐配置** - 选择推荐的字段组合（CPC分类、技术领域、优先权日期、法律事件）

### 智能提示
- **实时统计**：显示已选择字段数量
- **性能警告**：选择多个耗时字段时显示警告
- **字段标注**：
  - `推荐` - 建议选择的字段
  - `耗时` - 会显著增加爬取时间的字段

### 使用示例

```javascript
// 获取用户选择的字段
function getSelectedFields() {
    return {
        // 基础字段（始终为true）
        basic: true,
        title: true,
        abstract: true,
        // ... 其他基础字段
        
        // 可选字段（根据用户选择）
        classifications: document.getElementById('field_classifications')?.checked || false,
        landscapes: document.getElementById('field_landscapes')?.checked || false,
        // ... 其他可选字段
    };
}

// 发送爬取请求
fetch('/api/batch_scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        patent_numbers: ['US12390907B2', 'CN104154208B'],
        fields: getSelectedFields()
    })
});
```

---

## ✨ 功能二：事件时间轴

### 设计理念
- **可视化展示**：以时间轴形式直观展示专利生命周期
- **关键事件突出**：重要事件用特殊样式标记
- **响应式设计**：适配桌面和移动端

### 时间轴样式

#### 视觉元素
1. **主时间线**：垂直渐变线条（蓝色）
2. **事件节点**：圆形节点，关键事件为实心
3. **事件卡片**：左右交替排列，悬停效果
4. **连接线**：节点到卡片的连接线

#### 事件类型
- **关键事件** (critical)：申请、公开、授权、当前状态
  - 实心蓝色节点
  - 蓝色代码标签
- **普通事件**：转让、其他法律事件
  - 空心节点
  - 浅蓝色代码标签

### 事件信息结构

```javascript
{
    date: "2018-07-13",           // 事件日期
    title: "申请提交",             // 事件标题
    code: "filed",                // 事件代码
    description: "Application...", // 事件描述
    critical: true                // 是否为关键事件
}
```

### 示例事件

1. **2018-07-13** - 申请提交 `filed`
2. **2021-09-02** - 公开发布 `publication`
3. **2024-12-10** - 权利转让 `reassignment`
4. **2025-08-19** - 专利授权 `granted`
5. **当前** - 专利有效 `Active`

### 响应式适配

#### 桌面端（>768px）
- 时间线居中
- 事件左右交替
- 完整卡片展示

#### 移动端（≤768px）
- 时间线靠左
- 事件统一右侧
- 紧凑布局

---

## 🎨 样式文件

### 1. `frontend/css/components/field-selector.css`
字段选择器的完整样式，包括：
- 字段分组样式
- 复选框样式
- 悬停效果
- 统计信息
- 警告提示

### 2. `frontend/css/components/patent-timeline.css`
事件时间轴的完整样式，包括：
- 时间线主线
- 事件节点
- 事件卡片
- 连接线
- 响应式布局

---

## 📁 文件结构

```
frontend/css/components/
├── field-selector.css       # 字段选择器样式
└── patent-timeline.css      # 事件时间轴样式

test_patent_batch_with_fields.html  # 完整演示页面
```

---

## 🚀 使用方法

### 1. 引入样式文件

```html
<link rel="stylesheet" href="frontend/css/components/field-selector.css">
<link rel="stylesheet" href="frontend/css/components/patent-timeline.css">
```

### 2. 字段选择器HTML

```html
<div class="field-selector-container">
    <div class="field-selector-header">
        <div class="field-selector-title">选择要爬取的字段</div>
        <div class="field-selector-actions">
            <button onclick="selectAllOptionalFields()">全选可选</button>
            <button onclick="deselectAllOptionalFields()">取消全选</button>
            <button onclick="selectRecommendedFields()">推荐配置</button>
        </div>
    </div>
    
    <!-- 字段分组 -->
    <div class="field-group">
        <div class="field-group-title">
            📋 基础信息
            <span class="field-group-badge required">必选</span>
        </div>
        <div class="field-options-grid">
            <div class="field-option disabled checked">
                <input type="checkbox" checked disabled>
                <span class="field-option-label">专利号</span>
            </div>
            <!-- 更多字段... -->
        </div>
    </div>
</div>
```

### 3. 事件时间轴HTML

```html
<div class="patent-timeline-container">
    <div class="patent-timeline">
        <div class="timeline-event critical">
            <div class="timeline-event-content">
                <div class="timeline-event-date">2018-07-13</div>
                <div class="timeline-event-title">申请提交</div>
                <div class="timeline-event-code">filed</div>
                <div class="timeline-event-description">
                    Application filed by Stanley Black and Decker Inc
                </div>
            </div>
            <div class="timeline-event-node"></div>
            <div class="timeline-event-connector"></div>
        </div>
        <!-- 更多事件... -->
    </div>
</div>
```

---

## 💡 最佳实践

### 字段选择建议

#### 快速查询（推荐配置）
```
✅ 基础信息（8个）
✅ CPC分类
✅ 技术领域
✅ 优先权日期
✅ 法律事件
```
**预计时间**：~1.5秒/专利

#### 完整分析
```
✅ 基础信息（8个）
✅ 所有分类与领域（3个）
✅ 同族信息（3个）
✅ 引用信息（2个）
✅ 法律与事件（2个）
✅ 附加内容（3个）
```
**预计时间**：~3-5秒/专利

#### 最小配置
```
✅ 基础信息（8个）
```
**预计时间**：~1秒/专利

### 时间轴展示建议

1. **只显示关键事件**：申请、公开、授权、当前状态
2. **限制事件数量**：最多显示10-15个事件
3. **提供展开/收起**：对于事件较多的专利

---

## 🔧 后端API适配

### 请求格式

```json
{
    "patent_numbers": ["US12390907B2", "CN104154208B"],
    "fields": {
        "basic": true,
        "classifications": true,
        "landscapes": true,
        "family_applications": false,
        "description": false
    }
}
```

### 响应格式

```json
{
    "success": true,
    "results": [
        {
            "patent_number": "US12390907B2",
            "data": {
                "title": "...",
                "abstract": "...",
                "classifications": [...],  // 仅当fields.classifications=true时返回
                "legal_events": [...]      // 用于生成时间轴
            }
        }
    ]
}
```

---

## 📊 性能对比

| 配置 | 字段数 | 平均时间 | 适用场景 |
|-----|--------|---------|---------|
| 最小配置 | 8 | ~1秒 | 快速查询 |
| 推荐配置 | 12 | ~1.5秒 | 日常使用 |
| 完整配置 | 21 | ~3-5秒 | 深度分析 |

---

## 🎉 总结

本次UI增强为功能六带来了两个重要功能：

1. **字段选择器**
   - 灵活的字段选择
   - 智能的性能提示
   - 友好的用户体验

2. **事件时间轴**
   - 直观的可视化展示
   - 优雅的交互效果
   - 完整的响应式支持

这些功能让用户能够更精准地控制爬取内容，同时以更直观的方式了解专利的生命周期！
