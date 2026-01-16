# Design Document: CSS优化升级

## Overview

本设计文档描述了专利分析智能工作台CSS样式系统的优化升级方案。优化目标是在保持现有绿色主题和整体风格的基础上，通过引入统一的设计系统、改进的动画效果、增强的交互反馈和优化的响应式布局，提升用户界面的现代感和用户体验。

设计遵循以下核心原则：
- **一致性**：统一的视觉语言和交互模式
- **流畅性**：自然的动画和过渡效果
- **可访问性**：符合WCAG标准的对比度和键盘导航
- **响应式**：适配各种屏幕尺寸的布局
- **性能**：优化的CSS选择器和动画性能

## Architecture

### 设计系统架构

CSS样式系统采用模块化架构，分为以下层次：

```
frontend/css/
├── base/
│   ├── variables.css      # 设计令牌（颜色、间距、阴影等）
│   ├── reset.css          # 基础重置样式
│   └── animations.css     # 全局动画定义
├── layout/
│   ├── container.css      # 容器布局
│   ├── header.css         # 头部布局
│   └── steps.css          # 步骤导航布局
├── components/
│   ├── buttons.css        # 按钮组件
│   ├── forms.css          # 表单组件
│   ├── modals.css         # 模态框组件
│   ├── tabs.css           # 标签页组件
│   ├── tables.css         # 表格组件
│   └── ...
└── pages/
    ├── chat.css           # 聊天页面
    └── claims.css         # 权利要求页面
```

### 设计令牌系统

设计令牌（Design Tokens）是设计系统的基础，定义在`variables.css`中：

1. **颜色系统**
   - 主题色：保持现有绿色主题
   - 语义色：成功、错误、警告、信息
   - 中性色：文本、边框、背景

2. **间距系统**
   - 基于4px的8点网格系统
   - 定义9个间距级别：xs(4px), sm(8px), md(12px), base(16px), lg(20px), xl(24px), 2xl(32px), 3xl(40px), 4xl(48px)

3. **阴影系统**
   - 4个层级：subtle, low, medium, high
   - 用于表示元素的层级关系

4. **动画系统**
   - 3个时长：fast(150ms), normal(250ms), slow(350ms)
   - 标准缓动函数：ease-out, ease-in-out, spring

5. **字体系统**
   - 字体大小：xs, sm, base, lg, xl, 2xl, 3xl
   - 字重：normal(400), medium(500), semibold(600), bold(700)

## Components and Interfaces

### 1. 设计令牌（variables.css）

扩展现有的CSS变量，添加新的设计令牌：

```css
:root {
  /* 现有颜色保持不变 */
  --bg-color: #F0FDF4;
  --surface-color: #FFFFFF;
  --primary-color: #22C55E;
  --primary-color-dark: #16A34A;
  
  /* 新增：间距系统 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-base: 16px;
  --spacing-lg: 20px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  --spacing-3xl: 40px;
  --spacing-4xl: 48px;
  
  /* 新增：阴影系统 */
  --shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-low: 0 2px 4px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-high: 0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.08);
  
  /* 新增：动画时长 */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 350ms;
  
  /* 新增：缓动函数 */
  --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  /* 新增：圆角系统 */
  --radius-sm: 4px;
  --radius-base: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
  
  /* 新增：字体大小 */
  --font-xs: 0.75rem;    /* 12px */
  --font-sm: 0.875rem;   /* 14px */
  --font-base: 1rem;     /* 16px */
  --font-lg: 1.125rem;   /* 18px */
  --font-xl: 1.25rem;    /* 20px */
  --font-2xl: 1.5rem;    /* 24px */
  --font-3xl: 1.875rem;  /* 30px */
}
```

### 2. 动画系统（animations.css）

优化现有动画，添加新的动画效果：

```css
/* 优化的淡入动画 */
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 新增：缩放淡入 */
@keyframes scale-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 新增：滑入动画 */
@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 新增：弹跳动画 */
@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* 新增：脉冲动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 新增：旋转加载 */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 3. 按钮组件（buttons.css）

优化按钮样式，使用新的设计令牌：

```css
/* 主按钮 - 使用新的设计令牌 */
button {
  background: linear-gradient(45deg, var(--primary-color-dark), var(--primary-color));
  color: #FFFFFF;
  font-weight: 600;
  border: none;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-base);
  cursor: pointer;
  font-size: var(--font-base);
  transition: all var(--duration-normal) var(--ease-out);
  box-shadow: var(--shadow-low);
  min-height: 44px; /* 可访问性：最小触摸目标 */
}

button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
  filter: brightness(1.05);
}

button:active {
  transform: translateY(0) scale(0.98);
  box-shadow: var(--shadow-subtle);
  transition-duration: var(--duration-fast);
}

button:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

button:disabled {
  background: rgba(34, 197, 94, 0.4);
  color: rgba(255, 255, 255, 0.7);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.6;
}

/* 图标按钮 - 优化交互 */
.icon-button {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-color-secondary);
  padding: var(--spacing-xs);
  border-radius: var(--radius-full);
  width: 32px;
  height: 32px;
  min-height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--duration-fast) var(--ease-out);
  box-shadow: none;
}

.icon-button:hover {
  background: var(--primary-color-hover-bg);
  color: var(--primary-color);
  transform: scale(1.1);
}

.icon-button:active {
  transform: scale(0.95);
}
```

### 4. 表单组件（forms.css）

优化表单元素的交互反馈：

```css
/* 输入框 - 增强焦点状态 */
input,
select,
textarea {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: var(--spacing-md);
  border-radius: var(--radius-base);
  width: 100%;
  font-size: var(--font-base);
  transition: all var(--duration-normal) var(--ease-out);
  min-height: 44px; /* 可访问性 */
}

input:hover,
select:hover,
textarea:hover {
  border-color: var(--primary-color);
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-glow),
              var(--shadow-low);
  transform: translateY(-1px);
}

/* 验证状态 */
input.valid,
select.valid,
textarea.valid {
  border-color: var(--success-color);
}

input.invalid,
select.invalid,
textarea.invalid {
  border-color: var(--error-color);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

### 5. 模态框组件（modals.css）

增强模态框的动画效果：

```css
/* 模态框 - 优化动画 */
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px); /* 背景模糊 */
  animation: fade-in var(--duration-normal) var(--ease-out);
}

.modal-content {
  background-color: var(--surface-color);
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  padding: var(--spacing-xl);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 600px;
  max-width: 90%;
  max-height: 90vh;
  box-shadow: var(--shadow-high);
  animation: scale-fade-in var(--duration-normal) var(--ease-spring);
  overflow: hidden;
}

.modal.closing .modal-content {
  animation: scale-fade-out var(--duration-fast) var(--ease-in-out);
}

@keyframes scale-fade-out {
  from {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
}
```

### 6. 聊天界面（chat.css）

优化聊天消息的展示和动画：

```css
/* 聊天消息 - 添加阴影和动画 */
.chat-message {
  display: flex;
  gap: 0;
  margin-bottom: var(--spacing-lg);
  width: 100%;
  animation: slide-in-right var(--duration-normal) var(--ease-out);
}

.message-content {
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: 18px;
  word-break: break-word;
  position: relative;
  box-shadow: var(--shadow-subtle);
  transition: box-shadow var(--duration-fast) var(--ease-out);
}

.message-content:hover {
  box-shadow: var(--shadow-low);
}

/* 聊天窗口 - 平滑滚动 */
#chat_window {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  background-color: var(--chat-bg);
  display: flex;
  flex-direction: column;
  scroll-behavior: smooth; /* 平滑滚动 */
}

/* 消息操作按钮 - 悬停显示 */
.message-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md) 0;
  border-top: 1px solid rgba(0,0,0,0.05);
  margin-top: var(--spacing-md);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.chat-message:hover .message-footer {
  opacity: 1;
}
```

### 7. 表格组件（tables.css）

优化表格的可读性和交互：

```css
/* 表格 - 优化样式 */
table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
}

th,
td {
  border-bottom: 1px solid var(--border-color);
  padding: var(--spacing-md) var(--spacing-base);
  text-align: left;
  vertical-align: middle;
}

th {
  font-weight: 600;
  color: var(--text-color-secondary);
  background-color: var(--surface-color);
  position: sticky; /* 粘性表头 */
  top: 0;
  z-index: 10;
  box-shadow: 0 1px 0 var(--border-color);
}

/* 斑马纹 */
tbody tr:nth-child(even) {
  background-color: rgba(34, 197, 94, 0.02);
}

/* 悬停效果 */
tbody tr {
  transition: background-color var(--duration-fast) var(--ease-out);
}

tbody tr:hover {
  background-color: var(--primary-color-hover-bg);
}

/* 表格容器 - 水平滚动 */
.table-container {
  overflow-x: auto;
  border-radius: var(--radius-base);
  border: 1px solid var(--border-color);
}
```

### 8. 响应式布局

添加移动端优化的媒体查询：

```css
/* 平板设备 */
@media (max-width: 992px) {
  :root {
    --font-base: 0.9375rem; /* 15px */
    --spacing-base: 14px;
  }
  
  .container {
    max-width: 100%;
    border-radius: 0;
  }
  
  #instant-chat-layout {
    grid-template-columns: 240px 1fr;
    gap: var(--spacing-base);
  }
}

/* 移动设备 */
@media (max-width: 768px) {
  :root {
    --font-base: 0.875rem; /* 14px */
    --spacing-base: 12px;
  }
  
  body {
    padding: var(--spacing-sm);
  }
  
  .container {
    border-radius: 0;
  }
  
  /* 聊天布局 - 垂直堆叠 */
  #instant-chat-layout {
    grid-template-columns: 1fr;
    gap: var(--spacing-md);
  }
  
  #chat_history_panel {
    max-height: 200px;
  }
  
  /* 按钮 - 全宽 */
  .action-button {
    width: 100%;
    min-width: auto;
  }
  
  /* 模态框 - 全屏 */
  .modal-content {
    width: 95%;
    max-height: 95vh;
    border-radius: var(--radius-base);
  }
  
  /* 表格 - 响应式 */
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* 标签页 - 滚动 */
  .main-tab-container,
  .sub-tab-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* 小屏手机 */
@media (max-width: 480px) {
  :root {
    --font-base: 0.8125rem; /* 13px */
  }
  
  .app-header {
    flex-direction: column;
    gap: var(--spacing-md);
  }
  
  .logo-container {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
}
```

## Data Models

本项目主要涉及CSS样式定义，不涉及复杂的数据模型。主要的"数据"是设计令牌（Design Tokens），已在Components部分详细定义。

## Correctness Properties

*属性（Property）是关于系统应该如何行为的形式化陈述，它应该在所有有效执行中保持为真。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 设计令牌完整性
*For any* CSS变量类别（颜色、间距、阴影、动画），所有必需的设计令牌都应该在variables.css中定义且具有有效值。
**Validates: Requirements 1.1, 2.1, 4.1**

### Property 2: 阴影层级一致性
*For any* 使用阴影的元素，其阴影值应该来自定义的四个阴影层级之一（subtle, low, medium, high）。
**Validates: Requirements 1.2**

### Property 3: 过渡属性存在性
*For any* 交互元素（按钮、输入框、链接），应该定义transition属性以提供平滑的状态变化。
**Validates: Requirements 2.3, 3.1**

### Property 4: 焦点指示器可见性
*For any* 可聚焦元素，:focus或:focus-visible伪类应该定义明显的视觉样式（outline或box-shadow）。
**Validates: Requirements 3.2, 11.1**

### Property 5: 按钮最小尺寸
*For any* 按钮元素，其计算后的最小高度应该至少为44px以满足可访问性要求。
**Validates: Requirements 5.5, 10.4**

### Property 6: 间距系统一致性
*For any* 使用padding或margin的组件，其值应该使用定义的间距变量而不是硬编码的像素值。
**Validates: Requirements 4.2, 4.3**

### Property 7: 颜色对比度合规性
*For any* 文本元素，其颜色与背景色的对比度应该至少达到4.5:1以符合WCAG AA标准。
**Validates: Requirements 11.2**

### Property 8: 响应式断点覆盖
*For any* 需要响应式调整的组件，应该至少定义768px断点的媒体查询规则。
**Validates: Requirements 10.1, 10.2, 10.3**

### Property 9: 动画性能优化
*For any* CSS动画或过渡，应该只对transform和opacity属性进行动画以确保性能。
**Validates: Requirements 2.3**

### Property 10: 减少动画偏好支持
*For any* 定义动画的CSS文件，应该包含@media (prefers-reduced-motion: reduce)规则来尊重用户偏好。
**Validates: Requirements 2.5, 11.5**

## Error Handling

CSS本身不涉及传统意义上的错误处理，但需要考虑以下降级策略：

1. **浏览器兼容性**
   - 使用CSS变量时提供回退值
   - 使用现代CSS特性时提供降级方案
   - 使用autoprefixer添加浏览器前缀

2. **缺失资源**
   - 字体加载失败时使用系统字体栈
   - 图片加载失败时显示占位符

3. **性能降级**
   - 在低性能设备上简化动画
   - 使用will-change提示浏览器优化
   - 避免过度使用box-shadow和blur

4. **可访问性降级**
   - 确保在禁用CSS时内容仍可访问
   - 使用语义化HTML作为基础
   - 提供文本替代方案

## Testing Strategy

### 单元测试

使用工具验证CSS的正确性：

1. **CSS Lint**
   - 使用stylelint验证CSS语法和最佳实践
   - 检查未使用的CSS规则
   - 验证颜色对比度

2. **视觉回归测试**
   - 使用Percy或Chromatic进行视觉回归测试
   - 对比优化前后的截图
   - 验证不同浏览器的渲染一致性

3. **可访问性测试**
   - 使用axe-core检查可访问性问题
   - 验证颜色对比度
   - 测试键盘导航

4. **响应式测试**
   - 在不同设备尺寸下测试布局
   - 验证断点行为
   - 测试触摸目标大小

### 属性测试

虽然CSS不适合传统的属性测试，但可以通过以下方式验证：

1. **设计令牌验证**
   - 编写脚本解析variables.css
   - 验证所有必需的变量都已定义
   - 检查变量值的格式正确性

2. **样式一致性检查**
   - 扫描所有CSS文件
   - 验证使用了设计令牌而非硬编码值
   - 检查阴影、间距、颜色的一致性

3. **对比度计算**
   - 提取所有颜色组合
   - 计算对比度比率
   - 验证符合WCAG标准

4. **响应式覆盖检查**
   - 解析媒体查询
   - 验证关键组件有响应式规则
   - 检查断点的一致性

### 测试工具配置

**stylelint配置** (.stylelintrc.json):
```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "color-hex-length": "long",
    "declaration-no-important": true,
    "max-nesting-depth": 3,
    "selector-max-id": 0,
    "color-named": "never",
    "declaration-property-value-disallowed-list": {
      "/^border/": ["none"],
      "/^transition/": ["/all/"]
    }
  }
}
```

**测试脚本示例**:
```javascript
// 验证设计令牌完整性
const requiredTokens = [
  '--spacing-xs', '--spacing-sm', '--spacing-md',
  '--shadow-subtle', '--shadow-low', '--shadow-medium', '--shadow-high',
  '--duration-fast', '--duration-normal', '--duration-slow'
];

function validateDesignTokens(cssContent) {
  const missingTokens = requiredTokens.filter(token => 
    !cssContent.includes(token)
  );
  
  if (missingTokens.length > 0) {
    throw new Error(`Missing design tokens: ${missingTokens.join(', ')}`);
  }
}

// 验证颜色对比度
function validateContrast(foreground, background) {
  const ratio = calculateContrastRatio(foreground, background);
  if (ratio < 4.5) {
    throw new Error(`Insufficient contrast: ${ratio.toFixed(2)}:1`);
  }
}
```

### 手动测试清单

1. **视觉检查**
   - [ ] 所有按钮有hover效果
   - [ ] 输入框focus时有明显指示
   - [ ] 模态框打开/关闭动画流畅
   - [ ] 聊天消息有适当阴影
   - [ ] 表格行hover高亮正常

2. **交互测试**
   - [ ] 键盘Tab导航焦点清晰
   - [ ] 按钮点击有反馈
   - [ ] 表单验证状态显示正确
   - [ ] 滚动行为平滑

3. **响应式测试**
   - [ ] 在手机上布局正常
   - [ ] 在平板上布局正常
   - [ ] 触摸目标足够大
   - [ ] 横屏模式正常

4. **可访问性测试**
   - [ ] 使用屏幕阅读器测试
   - [ ] 仅使用键盘操作
   - [ ] 启用高对比度模式
   - [ ] 启用减少动画偏好

