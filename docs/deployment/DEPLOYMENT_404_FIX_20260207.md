# 部署404错误诊断和修复方案

**日期**: 2026-02-07  
**问题**: 部署到阿里云后所有组件返回404错误  
**状态**: 🔴 已识别根本原因，待修复

---

## 🔍 问题诊断

### 症状
部署到阿里云服务器后，所有页面组件无法加载：
```
https://ipx.asia/components/header.html → HTTP 404
https://ipx.asia/components/tab-navigation.html → HTTP 404
https://ipx.asia/components/tabs/instant-chat.html → HTTP 404
```

### 根本原因

**在 `js/main.js` 中使用了错误的组件路径：**

```javascript
// ❌ 错误：缺少 'frontend/' 前缀
await loadComponent('components/header.html', 'header-component');
await loadComponent('components/tab-navigation.html', 'tab-navigation-component');
await loadComponent('components/tabs/instant-chat.html', 'instant-chat-component');
```

**应该使用：**

```javascript
// ✅ 正确：包含完整路径
await loadComponent('frontend/components/header.html', 'header-component');
await loadComponent('frontend/components/tab-navigation.html', 'tab-navigation-component');
await loadComponent('frontend/components/tabs/instant-chat.html', 'instant-chat-component');
```

### 为什么本地可能没有发现

1. **开发环境差异**：本地开发服务器可能配置了不同的静态文件路径映射
2. **相对路径解析**：浏览器在本地和服务器上解析相对路径的方式可能不同
3. **Nginx配置**：服务器的Nginx配置没有为 `/components/` 路径设置别名

---

## 🛠️ 修复方案

### 方案一：修复 js/main.js 路径（推荐）

**优点**：
- 符合项目路径规范
- 与 `PATH_REFERENCE_GUIDE.md` 一致
- 不需要修改服务器配置

**步骤**：

1. **修改 `js/main.js` 中的所有 loadComponent 调用**

需要修改的位置（共8处）：

```javascript
// Line 16: Header
await loadComponent('frontend/components/header.html', 'header-component');

// Line 24: Tab Navigation
await loadComponent('frontend/components/tab-navigation.html', 'tab-navigation-component');

// Line 32: Instant Chat
await loadComponent('frontend/components/tabs/instant-chat.html', 'instant-chat-component');

// Line 44: Async Batch
await loadComponent('frontend/components/tabs/async-batch.html', 'async-batch-component', {

// Line 72: Large Batch
await loadComponent('frontend/components/tabs/large-batch.html', 'large-batch-component', {

// Line 98: Local Patent Library
await loadComponent('frontend/components/tabs/local-patent-lib.html', 'local-patent-lib-component', {

// Line 124: Claims Comparison
await loadComponent('frontend/components/tabs/claims-comparison.html', 'claims-comparison-component', {

// Line 151: Patent Batch
await loadComponent('frontend/components/tabs/patent-batch.html', 'patent-batch-component');

// Line 166: Claims Processor
await loadComponent('frontend/components/tabs/claims-processor.html', 'claims-processor-component');

// Line 175: Drawing Marker
await loadComponent('frontend/components/tabs/drawing-marker.html', 'drawing-marker-component', {
```

2. **本地测试验证**

```bash
# 启动本地服务器测试
python -m http.server 8000

# 在浏览器中访问
http://localhost:8000/frontend/index.html

# 检查浏览器控制台是否有404错误
```

3. **提交修复**

```bash
git add js/main.js
git commit -m "修复：组件加载路径缺少frontend/前缀导致404错误"
git push origin main
```

4. **部署到服务器**

```bash
ssh root@43.99.101.195 "cd /home/appuser/patent-app && git pull origin main && chown -R appuser:appuser /home/appuser/patent-app && systemctl restart patent-app"
```

---

### 方案二：配置Nginx路径别名（备选）

**优点**：
- 不需要修改代码
- 可以支持多种路径格式

**缺点**：
- 需要修改服务器配置
- 不符合项目路径规范
- 可能导致路径混乱

**Nginx配置示例**：

```nginx
server {
    listen 80;
    server_name ipx.asia;
    
    root /home/appuser/patent-app;
    
    # 添加组件路径别名
    location /components/ {
        alias /home/appuser/patent-app/frontend/components/;
        try_files $uri $uri/ =404;
    }
    
    # 其他配置...
}
```

**不推荐此方案**，因为：
1. 违反了项目路径规范
2. 增加了配置复杂度
3. 可能导致未来的路径问题

---

## 📋 修复清单

- [ ] **步骤1**: 修改 `js/main.js` 中的所有组件路径
- [ ] **步骤2**: 本地测试验证（检查浏览器控制台）
- [ ] **步骤3**: 提交代码到Git
- [ ] **步骤4**: 推送到GitHub
- [ ] **步骤5**: 部署到阿里云服务器
- [ ] **步骤6**: 验证服务器上的页面加载
- [ ] **步骤7**: 检查所有功能是否正常

---

## 🔍 验证步骤

### 本地验证

1. **启动本地服务器**
   ```bash
   python -m http.server 8000
   ```

2. **打开浏览器开发者工具**
   - 按 F12 打开
   - 切换到 "Network" 标签

3. **访问页面**
   ```
   http://localhost:8000/frontend/index.html
   ```

4. **检查网络请求**
   - 所有 `.html` 文件应该返回 `200 OK`
   - 不应该有 `404 Not Found` 错误

### 服务器验证

1. **部署后访问**
   ```
   https://ipx.asia
   ```

2. **检查浏览器控制台**
   - 按 F12 打开开发者工具
   - 查看 Console 标签，应该看到：
     ```
     ✅ Header component loaded
     ✅ Tab navigation component loaded
     ✅ Instant chat component loaded
     ...
     ```

3. **检查网络请求**
   - 切换到 Network 标签
   - 刷新页面
   - 所有组件文件应该返回 200 状态码

4. **功能测试**
   - 点击各个标签页
   - 测试文件上传
   - 测试聊天功能
   - 确认所有功能正常

---

## 📚 相关文档

- `.kiro/specs/html-js-refactoring/PATH_REFERENCE_GUIDE.md` - 路径引用规范
- `docs/deployment/DEPLOYMENT_SAFETY_GUIDE_20260207.md` - 部署安全指南
- `js/core/COMPONENT_LOADER_README.md` - 组件加载器文档

---

## 🚨 重要提醒

1. **路径规范**：所有组件路径必须相对于项目根目录，包含 `frontend/` 前缀
2. **测试先行**：修复后必须先在本地测试，确认无误后再部署
3. **回退准备**：部署前确保回退点存在（已创建 `rollback-point-20260207`）
4. **验证完整**：部署后必须完整测试所有功能

---

## 📝 修复记录

| 时间 | 操作 | 结果 | 备注 |
|------|------|------|------|
| 2026-02-07 | 首次部署 | ❌ 失败 | 所有组件404错误 |
| 2026-02-07 | 回退到rollback-point | ✅ 成功 | 服务恢复正常 |
| 2026-02-07 | 诊断问题 | ✅ 完成 | 识别路径错误 |
| - | 修复路径 | ⏳ 待执行 | - |
| - | 重新部署 | ⏳ 待执行 | - |

---

**下一步行动**：修复 `js/main.js` 中的组件路径，然后重新部署。
