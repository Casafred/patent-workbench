# 文件缓存功能 - 测试指南

## 快速测试步骤

### 测试1: 首次上传文件
1. 打开浏览器开发者工具（F12）
2. 切换到"控制台"标签
3. 在聊天界面点击📎按钮
4. 选择一个PDF文件（例如：Noise limited power tool.pdf）
5. 选择服务类型（Lite/Expert/Prime）
6. 点击"上传"按钮
7. 等待解析完成

**预期结果**:
- ✅ 显示"已附加文件: Noise limited power tool.pdf"
- ✅ 控制台显示: `✅ 文件已保存到缓存: Noise limited power tool.pdf`

---

### 测试2: 再次上传相同文件（缓存命中）
1. 再次点击📎按钮
2. 选择**同一个**PDF文件
3. **注意**: 不需要选择服务，不需要点击上传

**预期结果**:
- ✅ **立即**显示"已附加文件（复用）: Noise limited power tool.pdf"
- ✅ 显示绿色勾号: `✓ 已缓存`
- ✅ 控制台显示: `✅ 文件已解析，直接复用缓存: Noise limited power tool.pdf`
- ✅ **无需等待，无API调用**

---

### 测试3: 验证缓存持久化
1. 上传并解析一个文件（如果还没有）
2. **关闭浏览器**（完全关闭，不是只关闭标签页）
3. 重新打开浏览器
4. 打开应用
5. 打开开发者工具控制台
6. 再次上传同一个文件

**预期结果**:
- ✅ 页面加载时控制台显示: `✅ 已加载文件缓存，共 X 个文件`
- ✅ 上传文件时仍然显示"已附加文件（复用）"
- ✅ 缓存在关闭浏览器后仍然有效

---

### 测试4: 查看缓存内容
1. 打开开发者工具控制台
2. 输入以下命令查看缓存:
```javascript
console.log(appState.chat.parsedFilesCache)
```

**预期结果**:
```javascript
{
  "Noise limited power tool.pdf": {
    taskId: "f92a9c61183645b8bba5116a4833850c",
    filename: "Noise limited power tool.pdf",
    content: "解析后的内容...",
    toolType: "lite",
    timestamp: 1738569600000
  }
}
```

---

### 测试5: 手动清除缓存
1. 打开开发者工具控制台
2. 输入以下命令:
```javascript
clearAllFileCache()
```
3. 再次上传之前缓存的文件

**预期结果**:
- ✅ 显示提示: "文件缓存已清除"
- ✅ 控制台显示: `✅ 已清除所有文件缓存`
- ✅ 再次上传文件需要重新解析（不再显示"复用"）

---

### 测试6: 自动清理过期缓存
**注意**: 这个测试需要等待7天，或者修改系统时间

#### 方法1: 修改系统时间（快速测试）
1. 上传并缓存一个文件
2. 修改系统时间到8天后
3. 刷新页面
4. 查看控制台

**预期结果**:
- ✅ 控制台显示: `🧹 已清理 1 个过期缓存文件`

#### 方法2: 等待7天（真实测试）
1. 上传并缓存一个文件
2. 等待7天
3. 刷新页面
4. 再次上传同一文件

**预期结果**:
- ✅ 缓存已过期，需要重新解析

---

## 验证缓存效果

### 性能对比

#### 无缓存（首次上传）
```
1. 选择文件: 1秒
2. 选择服务: 2秒
3. 点击上传: 1秒
4. 等待解析: 30秒
总计: 34秒
费用: 0.03元（Expert）或 0.05元（Prime）
```

#### 有缓存（再次上传）
```
1. 选择文件: 1秒
2. 立即显示: <1秒
总计: <2秒
费用: 0元
```

**节省**: 32秒 + 0.03-0.05元

---

## 常见问题

### Q1: 为什么缓存没有生效？
**可能原因**:
1. 文件名不同（缓存使用文件名作为键）
2. 缓存已过期（超过7天）
3. 缓存已被手动清除
4. localStorage 存储失败

**解决方法**:
- 检查控制台是否有错误信息
- 确认文件名完全相同
- 检查缓存: `console.log(appState.chat.parsedFilesCache)`

### Q2: 如何查看缓存了多少文件？
```javascript
console.log('缓存文件数量:', Object.keys(appState.chat.parsedFilesCache).length)
```

### Q3: 如何查看某个文件是否在缓存中？
```javascript
const filename = "Noise limited power tool.pdf";
if (appState.chat.parsedFilesCache[filename]) {
    console.log('✅ 文件已缓存');
} else {
    console.log('❌ 文件未缓存');
}
```

### Q4: 缓存占用多少空间？
```javascript
const cacheStr = JSON.stringify(appState.chat.parsedFilesCache);
const sizeKB = (cacheStr.length / 1024).toFixed(2);
console.log('缓存大小:', sizeKB, 'KB');
```

### Q5: 如何清除单个文件的缓存？
```javascript
const filename = "Noise limited power tool.pdf";
delete appState.chat.parsedFilesCache[filename];
localStorage.setItem('parsedFilesCache', JSON.stringify(appState.chat.parsedFilesCache));
console.log('✅ 已删除缓存:', filename);
```

---

## 调试技巧

### 1. 监控缓存操作
在控制台输入:
```javascript
// 保存原始函数
const originalHandleUpload = handleChatFileUpload;

// 包装函数添加日志
handleChatFileUpload = async function(event, fileFromReuse) {
    console.log('📤 开始处理文件上传');
    const result = await originalHandleUpload.call(this, event, fileFromReuse);
    console.log('✅ 文件上传处理完成');
    return result;
};
```

### 2. 查看缓存详情
```javascript
for (const filename in appState.chat.parsedFilesCache) {
    const cache = appState.chat.parsedFilesCache[filename];
    const age = Math.floor((Date.now() - cache.timestamp) / (1000 * 60 * 60 * 24));
    console.log(`📄 ${filename}:`, {
        服务类型: cache.toolType,
        内容长度: cache.content.length,
        缓存天数: age
    });
}
```

### 3. 模拟缓存过期
```javascript
// 将所有缓存的时间戳设置为8天前
for (const filename in appState.chat.parsedFilesCache) {
    appState.chat.parsedFilesCache[filename].timestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
}
localStorage.setItem('parsedFilesCache', JSON.stringify(appState.chat.parsedFilesCache));
console.log('✅ 已将所有缓存设置为8天前');

// 刷新页面触发自动清理
location.reload();
```

---

## 成功标志

如果看到以下现象，说明缓存功能正常工作：

✅ 首次上传显示: "✅ 文件已保存到缓存"  
✅ 再次上传显示: "✅ 文件已解析，直接复用缓存"  
✅ 再次上传显示: "已附加文件（复用）" + 绿色勾号  
✅ 页面加载显示: "✅ 已加载文件缓存，共 X 个文件"  
✅ 再次上传无需等待，立即可用  
✅ 关闭浏览器后缓存仍然有效  

---

## 报告问题

如果发现问题，请提供以下信息：

1. **控制台日志**: 复制所有相关日志
2. **缓存内容**: `console.log(appState.chat.parsedFilesCache)`
3. **localStorage内容**: `console.log(localStorage.getItem('parsedFilesCache'))`
4. **操作步骤**: 详细描述你的操作
5. **预期结果**: 你期望看到什么
6. **实际结果**: 实际发生了什么

---

**祝测试顺利！** 🎉
