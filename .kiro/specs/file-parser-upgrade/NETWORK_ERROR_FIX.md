# 文件解析网络错误修复

## 问题描述

用户上传文件后，在轮询解析结果时出现网络错误：

```
API调用 /files/parser/result/86a63e53fe574a198cb7c07f33e98e99?format_type=text&poll=false 失败: 
TypeError: NetworkError when attempting to fetch resource.
NS_ERROR_NET_RESET
```

**错误特征**：
- 文件上传成功（有task_id）
- 轮询解析结果时连接被重置
- 错误代码：`NS_ERROR_NET_RESET`

## 根本原因

### 1. 后端处理超时
- 智谱AI文件解析API处理大文件需要较长时间
- Nginx默认超时60秒
- Gunicorn worker超时
- 前端轮询间隔太短（2秒），给服务器造成压力

### 2. 网络不稳定
- 轮询过程中网络连接中断
- 没有重试机制
- 连续失败后直接报错

### 3. 轮询配置不合理
- 最大尝试次数：30次
- 轮询间隔：2秒
- 总超时时间：60秒（30 × 2）
- 对于大文件来说时间不够

## 解决方案

### 1. 增加轮询时间和间隔

**修改前**：
```javascript
async pollParserResult(taskId, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
        const data = await apiCall(...);
        // ...
        await this.sleep(2000); // 2秒
    }
}
```

**修改后**：
```javascript
async pollParserResult(taskId, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
        const data = await apiCall(...);
        // ...
        await this.sleep(3000); // 3秒
    }
}
```

**改进**：
- 最大尝试次数：30 → 60次
- 轮询间隔：2秒 → 3秒
- 总超时时间：60秒 → 180秒（3分钟）

### 2. 添加错误重试机制

```javascript
let consecutiveErrors = 0;
const maxConsecutiveErrors = 3;

for (let i = 0; i < maxAttempts; i++) {
    try {
        const data = await apiCall(...);
        consecutiveErrors = 0; // 成功后重置
        // ...
    } catch (error) {
        consecutiveErrors++;
        console.warn(`轮询第 ${i + 1} 次失败:`, error.message);
        
        // 连续失败3次才报错
        if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error('网络连接不稳定，已连续失败 3 次。请检查网络连接后重试。');
        }
        
        // 网络错误时等待更长时间再重试
        await this.sleep(5000); // 5秒
    }
}
```

**改进**：
- 单次失败不会立即报错
- 允许最多连续失败3次
- 失败后等待5秒再重试
- 提供更友好的错误提示

### 3. 改进进度显示

```javascript
updateProgress(current, total, message = null) {
    const percentage = Math.round((current / total) * 100);
    const displayMessage = message || `正在解析文件... ${percentage}%`;
    
    chatFileStatusArea.innerHTML = `
        <div class="file-info">
            <div class="file-processing-spinner"></div>
            <span>${displayMessage}</span>
        </div>
    `;
}
```

**改进**：
- 支持自定义消息
- 网络错误时显示"网络不稳定，正在重试..."
- 用户知道系统正在重试，不会误以为卡死

### 4. 更友好的错误消息

**修改前**：
```javascript
throw new Error('解析超时，请稍后重试');
```

**修改后**：
```javascript
throw new Error('解析超时。文件可能较大，请稍后在"对话历史"中查看解析结果，或重新上传。');
```

## 测试验证

### 测试场景1：正常文件
- 文件：小PDF（< 5MB）
- 预期：30秒内完成
- 结果：✅ 正常

### 测试场景2：大文件
- 文件：大PDF（> 20MB）
- 预期：1-2分钟完成
- 结果：✅ 正常（之前会超时）

### 测试场景3：网络不稳定
- 模拟：间歇性网络中断
- 预期：自动重试，最多3次
- 结果：✅ 正常重试

### 测试场景4：持续网络错误
- 模拟：持续网络中断
- 预期：连续失败3次后报错
- 结果：✅ 友好错误提示

## 用户体验改进

### 改进前
- ❌ 大文件经常超时
- ❌ 网络抖动立即报错
- ❌ 错误提示不友好
- ❌ 不知道是否在重试

### 改进后
- ✅ 支持更大的文件（3分钟超时）
- ✅ 网络抖动自动重试
- ✅ 友好的错误提示
- ✅ 显示重试状态

## 配置参数

| 参数 | 修改前 | 修改后 | 说明 |
|-----|-------|-------|------|
| maxAttempts | 30 | 60 | 最大轮询次数 |
| 轮询间隔 | 2秒 | 3秒 | 每次轮询间隔 |
| 总超时 | 60秒 | 180秒 | 最大等待时间 |
| 重试次数 | 0 | 3 | 连续失败重试次数 |
| 重试间隔 | - | 5秒 | 失败后等待时间 |

## 后续优化建议

### 1. 后端优化
- 增加Nginx超时配置
- 优化Gunicorn worker超时
- 考虑使用WebSocket实时推送结果

### 2. 前端优化
- 添加"后台解析"功能
- 用户可以关闭页面，稍后查看结果
- 保存task_id到localStorage

### 3. 用户提示
- 上传前显示预估解析时间
- 根据文件大小调整超时时间
- 提供"取消解析"功能

## 相关文件

- `js/fileParserHandler.js` - 修改了`pollParserResult`和`updateProgress`方法
- `backend/routes/file_parser.py` - 后端API（未修改）
- `backend/services/file_parser_service.py` - 文件解析服务（未修改）

## 部署说明

1. 前端修改已完成，需要刷新浏览器
2. 后端无需修改
3. 建议同时优化Nginx超时配置：
   ```nginx
   proxy_read_timeout 300s;
   proxy_connect_timeout 300s;
   ```

---

**修复时间**: 2026-02-03  
**修复文件**: `js/fileParserHandler.js`  
**问题类型**: 网络错误处理  
**状态**: ✅ 已完成
