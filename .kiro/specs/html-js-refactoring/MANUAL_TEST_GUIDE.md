# 手动测试指南 - HTML/JS 重构验证

## 测试目的
验证Task 8完成后,所有功能是否正常工作,特别是修复的初始化错误。

## 测试环境准备

1. **打开浏览器开发者工具**
   - 按 F12 或右键 → 检查
   - 切换到 Console 标签页

2. **刷新页面**
   - 按 Ctrl+F5 (强制刷新,清除缓存)
   - 或者 Ctrl+Shift+R

## 测试检查点

### ✅ 第一步: 检查控制台输出

**期望看到的日志**:
```
开始初始化所有模块
✅ Header component loaded
✅ Tab navigation component loaded
✅ Instant chat component loaded
✅ Chat initialized
✅ Feature 2 (Async Batch) component loaded
🔧 Initializing Async Batch module...
✅ Async Batch module initialized successfully
✅ Feature 3 (Large Batch) component loaded
🔧 Initializing Large Batch module...
✅ Large Batch module initialized successfully
✅ Feature 4 (Local Patent Library) component loaded
🔧 Initializing Local Patent Library module...
✅ Local Patent Library module initialized successfully
✅ Feature 5 (Claims Comparison) component loaded
🔧 Initializing Claims Comparison module...
✅ Claims Comparison module initialized successfully
✅ Feature 6 (Patent Batch) component loaded
✅ Feature 7 (Claims Processor) component loaded
✅ Feature 8 (Drawing Marker) component loaded
```

**不应该看到的错误**:
```
❌ Failed to load Feature X component: TypeError: Cannot read properties of null
❌ initAsyncBatch function not found
❌ Missing required elements: [...]
```

### ✅ 第二步: 测试 Feature 1 (即时对话)

**测试步骤**:
1. 点击 "即时对话" 标签页
2. 在输入框输入: "你好"
3. 点击发送按钮

**期望结果**:
- ✅ 消息成功发送
- ✅ 看到流式响应(文字逐字出现)
- ✅ 没有控制台错误

**可选测试**:
- 上传一个文件
- 创建新对话
- 切换对话
- 添加/删除 persona

### ✅ 第三步: 测试 Feature 2 (异步批处理)

**测试步骤**:
1. 点击 "异步批处理" 标签页
2. 查看页面是否正常显示
3. 点击 "添加输出字段" 按钮

**期望结果**:
- ✅ 标签页正常切换
- ✅ 页面元素正常显示
- ✅ 按钮可以点击
- ✅ 控制台没有错误: `Cannot read properties of null (reading 'addEventListener')`

**关键检查**:
- 输出字段配置区域是否显示
- 预设模板选择器是否工作
- Excel列数输入框是否存在

### ✅ 第四步: 测试 Feature 3 (大批量生成)

**测试步骤**:
1. 点击 "大批量生成" 标签页
2. 查看页面是否正常显示
3. 点击文件上传按钮

**期望结果**:
- ✅ 标签页正常切换
- ✅ 文件上传按钮可以点击
- ✅ 模板选择器正常显示
- ✅ 控制台没有错误

### ✅ 第五步: 测试 Feature 4 (本地专利库)

**测试步骤**:
1. 点击 "本地专利库" 标签页
2. 查看页面是否正常显示
3. 点击 "展开" 按钮

**期望结果**:
- ✅ 标签页正常切换
- ✅ 展开按钮可以点击
- ✅ 文件上传区域正常显示
- ✅ 控制台没有错误

### ✅ 第六步: 测试 Feature 5 (权利要求对比)

**测试步骤**:
1. 点击 "权利要求对比" 标签页
2. 查看页面是否正常显示
3. 点击 "添加权利要求" 按钮

**期望结果**:
- ✅ 标签页正常切换
- ✅ 添加按钮可以点击
- ✅ 模型选择器正常显示
- ✅ 控制台没有错误

### ✅ 第七步: 测试 Feature 6 (批量专利解读)

**测试步骤**:
1. 点击 "批量专利解读" 标签页
2. 查看页面是否正常显示
3. 在专利号输入框输入一个测试专利号

**期望结果**:
- ✅ 标签页正常切换
- ✅ 输入框可以输入
- ✅ 专利号计数正常更新
- ✅ 控制台没有错误

### ✅ 第八步: 测试 Feature 7 (权利要求处理器)

**测试步骤**:
1. 点击 "权利要求处理器" 标签页
2. 查看页面是否正常显示
3. 查看子标签页是否正常

**期望结果**:
- ✅ 标签页正常切换
- ✅ 页面元素正常显示
- ✅ 控制台没有错误

**注意**: Feature 7 还没有被模块化,但应该正常工作。

### ✅ 第九步: 测试 Feature 8 (专利附图标记)

**测试步骤**:
1. 点击 "专利附图标记" 标签页
2. 查看页面是否正常显示
3. 查看上传区域是否正常

**期望结果**:
- ✅ 标签页正常切换
- ✅ 页面元素正常显示
- ✅ 控制台没有错误

## 测试结果记录

### 通过的测试 ✅
记录所有通过的测试:
- [ ] 控制台输出正常
- [ ] Feature 1 正常工作
- [ ] Feature 2 正常工作 (之前报错)
- [ ] Feature 3 正常工作 (之前报错)
- [ ] Feature 4 正常工作 (之前报错)
- [ ] Feature 5 正常工作 (之前报错)
- [ ] Feature 6 正常工作
- [ ] Feature 7 正常工作
- [ ] Feature 8 正常工作

### 失败的测试 ❌
记录所有失败的测试和错误信息:

**Feature**: ___________
**错误信息**: 
```
(粘贴控制台错误)
```

**重现步骤**:
1. 
2. 
3. 

## 常见问题排查

### 问题1: 仍然看到 "Cannot read properties of null" 错误

**可能原因**:
1. 浏览器缓存没有清除
2. 新的script标签没有加载

**解决方案**:
1. 按 Ctrl+Shift+Delete 清除浏览器缓存
2. 硬刷新页面 (Ctrl+F5)
3. 检查 Network 标签,确认新的 init-*.js 文件已加载

### 问题2: 某个功能完全不工作

**排查步骤**:
1. 检查控制台是否有 JavaScript 错误
2. 检查 Network 标签,确认所有 JS 文件都成功加载 (状态码 200)
3. 检查是否有文件路径错误 (404)

### 问题3: 初始化模块找不到

**检查**:
1. 确认 `frontend/index.html` 中包含新的 script 标签:
   ```html
   <script src="../js/modules/init/init-async-batch.js"></script>
   <script src="../js/modules/init/init-large-batch.js"></script>
   <script src="../js/modules/init/init-local-patent-lib.js"></script>
   <script src="../js/modules/init/init-claims-comparison.js"></script>
   <script src="../js/modules/init/init-patent-batch.js"></script>
   ```

2. 确认这些文件存在于 `js/modules/init/` 目录

## 性能检查

### 页面加载时间
1. 打开 Network 标签
2. 刷新页面
3. 查看 DOMContentLoaded 和 Load 时间

**期望**:
- DOMContentLoaded: < 2秒
- Load: < 5秒

### 内存使用
1. 打开 Performance Monitor (Ctrl+Shift+P → "Show Performance Monitor")
2. 观察 JS heap size

**期望**:
- 初始加载: < 50MB
- 使用后: < 100MB

## 测试完成后

### 如果所有测试通过 ✅
恭喜!Task 8 的修复成功了。你可以:
1. 继续使用应用程序
2. 考虑是否要执行 Task 6 (重构 Feature 7)
3. 继续后续的任务

### 如果有测试失败 ❌
请记录:
1. 失败的功能
2. 完整的错误信息
3. 重现步骤
4. 浏览器版本和操作系统

然后报告给开发团队进行修复。

---

**测试日期**: ___________
**测试人员**: ___________
**浏览器**: ___________
**操作系统**: ___________
**测试结果**: ⬜ 通过 / ⬜ 失败
