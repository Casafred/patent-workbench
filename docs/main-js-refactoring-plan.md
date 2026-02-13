# Main.js 拆分重构执行文档

## 📋 文档信息

- **项目名称**: 专利分析智能工作台 v26
- **目标文件**: `js/main.js` (2,648 行)
- **重构方案**: 保守拆分方案（方案1）
- **风险等级**: 低
- **预计耗时**: 2-3 小时
- **回滚时间**: 5 分钟

---

## 🎯 重构目标

将 `js/main.js` 从 2,648 行拆分为多个小文件，提高代码可维护性，同时保持最小改动和风险。

### 拆分后结构

```
js/
├── main.js (约 800 行，保留核心逻辑)
├── main/
│   ├── patent-detail-html.js (约 600 行，纯函数)
│   └── patent-export.js (约 150 行，独立功能)
└── main.js.backup (原文件备份)
```

---

## ✅ 前置条件检查清单

在执行重构前，请确认以下事项：

- [ ] 已完整阅读本文档
- [ ] 已备份项目数据库（如有）
- [ ] 已关闭其他开发者的并发修改
- [ ] 已准备好测试环境
- [ ] 已通知相关团队成员

---

## 📁 第一阶段：准备工作

### 1.1 创建备份

**操作步骤：**

1. 复制原文件作为备份：
```bash
# 在 PowerShell 中执行
copy js\main.js js\main.js.backup.$(Get-Date -Format "yyyyMMdd_HHmmss")
```

2. 创建新目录：
```bash
mkdir js\main
```

**验证：**
```bash
# 确认备份文件存在
ls js\main.js.backup.*

# 确认目录创建成功
ls js\main
```

### 1.2 代码分析确认

**需要提取的代码范围：**

| 功能模块 | 起始行 | 结束行 | 行数 | 目标文件 |
|---------|-------|-------|------|---------|
| 字段映射与HTML构建 | 1819 | 2414 | 595 | patent-detail-html.js |
| Excel导出功能 | 2550 | 2647 | 97 | patent-export.js |

---

## 🔧 第二阶段：创建新文件

### 2.1 创建 patent-detail-html.js

**文件路径**: `js/main/patent-detail-html.js`

**操作步骤：**

1. 创建新文件
2. 复制 `js/main.js` 中的以下内容：
   - 第 1819-1836 行：`FIELD_MAPPING` 常量
   - 第 1838-1860 行：`shouldShowField()` 函数
   - 第 1862-2414 行：`buildPatentDetailHTML()` 函数

**文件模板：**

```javascript
// js/main/patent-detail-html.js
// 专利详情HTML构建模块
// 从 main.js 拆分出来，负责构建专利详情展示的HTML内容

// =================================================================================
// 字段映射关系：将字段选择器的值映射到数据字段
// =================================================================================
const FIELD_MAPPING = {
    'abstract': ['abstract'],
    'claims': ['claims'],
    'description': ['description'],
    'classifications': ['classifications'],
    'landscapes': ['landscapes'],
    'family_id': ['family_id'],
    'family_applications': ['family_applications'],
    'country_status': ['country_status'],
    'patent_citations': ['patent_citations'],
    'cited_by': ['cited_by'],
    'events_timeline': ['events_timeline'],
    'legal_events': ['legal_events'],
    'similar_documents': ['similar_documents'],
    'drawings': ['drawings'],
    'external_links': ['external_links']
};

// =================================================================================
// 检查是否应该显示某个字段
// =================================================================================
function shouldShowField(fieldKey, selectedFields) {
    // 如果没有提供selectedFields，显示所有字段
    if (!selectedFields || selectedFields.length === 0) {
        return true;
    }
    
    // 基础字段始终显示（包括单数和复数形式）
    const baseFields = ['patent_number', 'title', 'abstract', 'applicant', 'inventor', 'assignees', 'inventors', 'application_date', 'publication_date', 'filing_date', 'priority_date', 'ipc_classification', 'url'];
    if (baseFields.includes(fieldKey)) {
        return true;
    }
    
    // 检查字段是否在选中列表中
    for (const selectedField of selectedFields) {
        const mappedFields = FIELD_MAPPING[selectedField];
        if (mappedFields && mappedFields.includes(fieldKey)) {
            return true;
        }
    }
    
    return false;
}

// =================================================================================
// 构建专利详情HTML
// =================================================================================
function buildPatentDetailHTML(result, selectedFields) {
    // [复制 main.js 第 1862-2414 行的完整代码]
    // 注意：将内部的 patentBatchAnalysisResults 引用改为 window.patentBatchAnalysisResults
}

// 导出到全局作用域
window.FIELD_MAPPING = FIELD_MAPPING;
window.shouldShowField = shouldShowField;
window.buildPatentDetailHTML = buildPatentDetailHTML;

console.log('✅ patent-detail-html.js 加载完成');
```

**关键修改点：**

在 `buildPatentDetailHTML` 函数内部，找到以下代码（约第 1924 行）：

```javascript
// 修改前：
const analysisResult = patentBatchAnalysisResults.find(item => item.patent_number === result.patent_number);

// 修改后：
const analysisResult = window.patentBatchAnalysisResults.find(item => item.patent_number === result.patent_number);
```

### 2.2 创建 patent-export.js

**文件路径**: `js/main/patent-export.js`

**操作步骤：**

1. 创建新文件
2. 复制 `js/main.js` 中的第 2550-2647 行

**文件模板：**

```javascript
// js/main/patent-export.js
// 专利数据导出模块
// 从 main.js 拆分出来，负责Excel导出功能

// =================================================================================
// 导出专利结果为Excel（全局函数，供标签页调用）
// =================================================================================
window.exportPatentResultsToExcel = async function() {
    const searchStatus = document.getElementById('search_status');
    
    if (!window.patentResults || window.patentResults.length === 0) {
        alert('没有可导出的专利数据');
        return;
    }
    
    // [复制 main.js 第 2559-2647 行的完整代码]
};

console.log('✅ patent-export.js 加载完成');
```

### 2.3 验证新文件

**检查清单：**

- [ ] `js/main/patent-detail-html.js` 文件存在
- [ ] `js/main/patent-export.js` 文件存在
- [ ] 两个文件都已添加全局导出代码
- [ ] `patentBatchAnalysisResults` 已改为 `window.patentBatchAnalysisResults`

---

## ✏️ 第三阶段：修改 index.html

### 3.1 定位修改位置

**文件路径**: `frontend/index.html`

**查找目标**: 找到第 1947 行的 main.js 加载代码：

```html
<!-- Main initialization - must load last -->
<script src="js/main.js?v=20260207e"></script>
```

### 3.2 添加新文件引用

**修改方案：**

在 main.js 之前添加新文件的引用：

```html
<!-- 功能六：批量专利解读 - 拆分模块（按依赖顺序加载） -->
<script src="js/main/patent-detail-html.js"></script>
<script src="js/main/patent-export.js"></script>

<!-- Main initialization - must load last -->
<script src="js/main.js?v=20260207e"></script>
```

**完整上下文示例：**

```html
    <!-- 功能六：关系专利分析标签页模块 -->
    <script src="js/modules/patent-batch/tab-manager.js"></script>
    <script src="js/modules/patent-batch/relation-batch-crawler.js"></script>
    
    <!-- 功能六：批量专利解读 - 拆分模块（按依赖顺序加载） -->
    <script src="js/main/patent-detail-html.js"></script>
    <script src="js/main/patent-export.js"></script>
    
    <!-- Main initialization - must load last -->
    <script src="js/main.js?v=20260207e"></script>
```

### 3.3 验证修改

**检查清单：**

- [ ] 新添加的 script 标签在 main.js 之前
- [ ] 文件路径正确（`js/main/` 前缀）
- [ ] 没有语法错误（标签闭合正确）

---

## ✂️ 第四阶段：精简 main.js

### 4.1 删除已提取的代码

**操作步骤：**

1. 打开 `js/main.js`
2. 删除第 1819-2414 行（字段映射与HTML构建）
3. 删除第 2550-2647 行（Excel导出功能）

**删除后保留的核心内容：**

```javascript
// js/main.js (精简版)

// =================================================================================
// 智能剪贴板系统初始化
// =================================================================================
// [保留]

// =================================================================================
// 加载进度管理
// =================================================================================
// [保留]

// =================================================================================
// 初始化
// =================================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // [保留]
});

// =================================================================================
// 批量专利解读功能
// =================================================================================

// 全局变量：存储解读结果
window.patentBatchAnalysisResults = [];  // 改为全局变量

function initPatentBatch() {
    // [保留]
}

// [保留其他核心函数...]

// 注意：以下功能已移至单独文件
// - buildPatentDetailHTML() -> js/main/patent-detail-html.js
// - exportPatentResultsToExcel() -> js/main/patent-export.js
```

### 4.2 更新注释

在文件顶部添加拆分说明：

```javascript
// js/main.js (Refactored Version)
// 
// 重构说明：
// 本文件已从 2,648 行精简为约 800 行
// 拆分出的模块：
// - js/main/patent-detail-html.js: 专利详情HTML构建 (约 600 行)
// - js/main/patent-export.js: Excel导出功能 (约 150 行)
//
// 最后重构日期: 2026-02-13
```

### 4.3 修改全局变量声明

**查找并替换：**

```javascript
// 修改前（第 297 行）：
let patentBatchAnalysisResults = [];

// 修改后：
window.patentBatchAnalysisResults = window.patentBatchAnalysisResults || [];
```

**原因：** 确保变量在全局作用域中，供拆分出的文件访问。

---

## 🧪 第五阶段：测试验证

### 5.1 浏览器控制台测试

**测试步骤：**

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 面板
3. 刷新页面（Ctrl+F5）
4. 检查是否有错误信息

**预期结果：**

```
✅ patent-detail-html.js 加载完成
✅ patent-export.js 加载完成
✅ 功能六批量专利解读已初始化
```

### 5.2 功能测试清单

#### 测试 1：专利查询功能
- [ ] 输入专利号，点击查询
- [ ] 检查是否正常显示结果
- [ ] 检查控制台是否有错误

#### 测试 2：专利详情弹窗
- [ ] 点击专利条带的"查看详情"按钮
- [ ] 检查弹窗是否正常显示
- [ ] 检查所有字段是否正确渲染
- [ ] 点击"上一条"/"下一条"按钮
- [ ] 使用键盘方向键导航

#### 测试 3：Excel导出功能
- [ ] 查询专利后，点击"导出Excel"按钮
- [ ] 检查文件是否正常下载
- [ ] 检查文件内容是否正确

#### 测试 4：新标签页打开
- [ ] 点击"新标签页"按钮
- [ ] 检查新标签页是否正常打开
- [ ] 检查内容是否正确显示

#### 测试 5：一键解读功能
- [ ] 选择模板，点击"一键解读"
- [ ] 检查解读结果是否正常显示
- [ ] 检查解读结果是否在弹窗中同步更新

### 5.3 错误排查

**如果出现问题，按以下步骤排查：**

1. **检查文件加载顺序**
   ```javascript
   // 在控制台执行
   console.log(typeof buildPatentDetailHTML);  // 应该输出 "function"
   console.log(typeof exportPatentResultsToExcel);  // 应该输出 "function"
   ```

2. **检查全局变量**
   ```javascript
   console.log(window.patentBatchAnalysisResults);  // 应该输出数组
   console.log(window.patentResults);  // 应该输出数组
   ```

3. **检查文件是否加载**
   ```javascript
   // 查看 Network 面板，确认以下文件已加载：
   // - js/main/patent-detail-html.js
   // - js/main/patent-export.js
   // - js/main.js
   ```

---

## 📝 第六阶段：文档更新

### 6.1 更新 init-patent-batch.js 注释

**文件路径**: `js/modules/init/init-patent-batch.js`

**修改内容：**

```javascript
// js/modules/init/init-patent-batch.js
// Initialization module for Feature 6 (Patent Batch)

/**
 * Initialize Patent Batch feature
 * This function should be called AFTER the patent-batch component HTML is loaded
 * Note: initPatentBatch is defined in js/main.js (core functions)
 *       Related HTML builder is in js/main/patent-detail-html.js
 */
```

### 6.2 创建重构记录

**文件路径**: `docs/REFACTORING.md`

```markdown
# 重构记录

## 2026-02-13 Main.js 拆分

### 变更内容
- 将 js/main.js 从 2,648 行拆分为多个文件
- 新增 js/main/patent-detail-html.js (约 600 行)
- 新增 js/main/patent-export.js (约 150 行)
- 精简 js/main.js 为约 800 行

### 影响范围
- frontend/index.html: 添加新文件引用
- js/modules/init/init-patent-batch.js: 更新注释

### 测试状态
- [x] 专利查询功能正常
- [x] 专利详情弹窗正常
- [x] Excel导出功能正常
- [x] 新标签页打开正常
- [x] 一键解读功能正常

### 回滚方案
如需回滚，执行：
```bash
copy js\main.js.backup.20260213_xxxxxx js\main.js
```
然后删除 index.html 中添加的 script 标签。
```

---

## 🚨 回滚方案

### 紧急情况处理

如果在重构后发现问题，按以下步骤回滚：

#### 方法 1：快速回滚（推荐）

```bash
# 1. 恢复 main.js
copy js\main.js.backup.20260213_xxxxxx js\main.js

# 2. 删除 index.html 中添加的 script 标签
# 手动编辑 frontend/index.html，删除以下两行：
# <script src="js/main/patent-detail-html.js"></script>
# <script src="js/main/patent-export.js"></script>
```

#### 方法 2：Git 回滚（如果使用 Git）

```bash
# 放弃所有修改
git checkout -- js/main.js
git checkout -- frontend/index.html

# 删除新增文件
git clean -fd js/main/
```

### 回滚检查清单

- [ ] main.js 已恢复为原文件
- [ ] index.html 中的新 script 标签已删除
- [ ] 页面功能测试通过
- [ ] 控制台无错误

---

## 📊 重构效果评估

### 代码量统计

| 文件 | 重构前行数 | 重构后行数 | 减少行数 |
|------|-----------|-----------|---------|
| main.js | 2,648 | ~800 | -1,848 |
| patent-detail-html.js | 0 | ~600 | +600 |
| patent-export.js | 0 | ~150 | +150 |
| **总计** | **2,648** | **~1,550** | **-1,098** |

### 可维护性提升

- ✅ 单一职责：每个文件只负责一个功能
- ✅ 代码复用：HTML构建函数可以被其他模块复用
- ✅ 易于测试：独立模块可以单独测试
- ✅ 降低冲突：多人开发时减少文件冲突

---

## 🔮 后续优化建议

### 短期优化（可选）

1. **继续拆分**
   - 将 `patent-batch-core.js` 和 `patent-batch-ui.js` 独立出来
   - 将 `patent-detail-modal.js` 独立出来

2. **代码优化**
   - 将 `FIELD_MAPPING` 和 `shouldShowField()` 合并到配置对象
   - 优化 `buildPatentDetailHTML()` 的渲染性能

### 长期规划（可选）

1. **模块化升级**
   - 使用 ES6 Module 替代全局函数
   - 使用 Webpack 或 Vite 进行模块打包

2. **框架迁移**
   - 考虑使用 Vue.js 或 React 重构前端
   - 使用组件化开发模式

---

## 📞 问题反馈

如果在执行过程中遇到问题，请记录以下信息：

1. 错误信息（控制台截图）
2. 操作步骤
3. 浏览器版本
4. 相关代码片段

---

**文档版本**: v1.0  
**最后更新**: 2026-02-13  
**作者**: AI Assistant  
**审核状态**: 待审核
