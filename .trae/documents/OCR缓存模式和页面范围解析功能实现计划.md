## 实现计划

### 一、智能缓存机制

**1. 创建前端OCR缓存管理器** (`js/modules/pdf-ocr/pdf-ocr-cache.js`)
- 缓存键格式：`ocr_文件hash_页码` 或 `ocr_文件hash_all`
- 支持单页缓存和完整文档缓存
- 缓存过期时间：7天
- 提供方法：`hasCache()`, `getCache()`, `setCache()`, `clearCache()`

**2. 修改解析模块** (`pdf-ocr-parser.js`)
- 解析前检查缓存
- 有缓存：直接使用缓存结果
- 无缓存：调用API后保存到缓存
- 显示缓存状态提示

### 二、页面范围选择解析

**1. 修改HTML** (`pdf-ocr-reader.html`)
- 解析范围下拉框增加"自定义范围"选项
- 添加页面范围输入框（默认隐藏）

**2. 修改解析逻辑** (`pdf-ocr-parser.js`)
- 解析范围格式支持：
  - 单页：`5`
  - 连续范围：`5-8`
  - 多范围：`1,3,5-8`
- 批量解析指定范围页面
- 显示解析进度

**3. 修改结果展示** (`pdf-ocr-viewer.js`)
- 确保结果列表按页面正确分组显示
- 渲染框与当前页面对应
- 页面切换时正确加载对应页面的缓存结果

### 三、文件修改清单

| 文件 | 修改内容 |
|------|----------|
| `js/modules/pdf-ocr/pdf-ocr-cache.js` | 新建 - OCR缓存管理器 |
| `js/modules/pdf-ocr/pdf-ocr-parser.js` | 修改 - 添加缓存检查和页面范围解析 |
| `js/modules/pdf-ocr/pdf-ocr-viewer.js` | 修改 - 优化多页面结果展示 |
| `js/modules/pdf-ocr/pdf-ocr-init.js` | 修改 - 初始化缓存管理器 |
| `frontend/components/tabs/pdf-ocr-reader.html` | 修改 - 添加页面范围输入UI |
| `frontend/css/components/pdf-ocr-reader.css` | 修改 - 添加相关样式 |

### 四、功能特性

1. **缓存命中提示**：显示"使用缓存结果"或"正在解析..."
2. **缓存状态指示**：缩略图上显示已解析页面的标记
3. **强制刷新**：支持按住Shift键强制重新解析
4. **页面范围验证**：自动验证输入的页码是否有效