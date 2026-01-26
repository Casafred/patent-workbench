# Vanta.js NET 背景动画集成完成

## 更新时间
2026-01-26

## 更新内容

### 1. 登录页面集成
✅ 已在 `backend/routes/auth.py` 中的登录页面模板集成 Vanta.js NET 动画

### 2. 主页面集成
✅ 已在 `frontend/index.html` 中集成 Vanta.js NET 动画

## 技术实现

### 引入的库
- Three.js (r134) - 3D 渲染引擎
- Vanta.js NET - 网格动画效果

### 视觉设计
**绿色系配色：**
- 连线颜色：`#4ade80` (荧光绿)
- 背景颜色：`#f0fdf4` (薄荷绿)

**简洁高格调设置：**
- `points: 8.00` - 较低的点数量，保持留白感
- `maxDistance: 18.00` - 较短的连线距离，避免拥挤
- `spacing: 18.00` - 较大的间距，避免网格细碎

**交互效果：**
- 启用鼠标跟随效果
- 支持触摸控制
- 微弱的交互反馈

### CSS 调整

#### 1. `frontend/css/base/reset.css`
- body 背景改为透明
- 添加 `position: relative` 和 `min-height: 100vh`

#### 2. `frontend/css/layout/container.css`
- container 背景改为半透明白色 `rgba(255, 255, 255, 0.95)`
- 添加毛玻璃效果 `backdrop-filter: blur(10px)`
- 添加 `z-index: 1` 确保在背景之上

#### 3. `frontend/index.html`
- 添加 `#vanta-bg` 容器，`z-index: -1`
- 在页面加载时初始化 Vanta.js

## 文件修改清单

### 修改的文件
1. `backend/routes/auth.py` - 登录页面模板
2. `frontend/index.html` - 主页面
3. `frontend/css/base/reset.css` - 基础样式
4. `frontend/css/layout/container.css` - 容器样式

## 测试步骤

### 本地测试
1. 启动 Flask 应用
2. 访问登录页面 `/login`
3. 登录后查看主页面
4. 验证动画效果：
   - 绿色网格动画背景
   - 半透明容器悬浮效果
   - 鼠标移动时的交互

### 部署测试
```bash
# 推送到 Git
git add -A
git commit -m "为主页面集成Vanta.js NET背景动画"
git push origin main

# 在服务器上拉取
git pull origin main

# 重启应用
# (根据你的部署方式重启)
```

## 性能优化建议

### CDN 加载
- Three.js 和 Vanta.js 都通过 CDN 加载
- 首次加载可能需要 1-2 秒
- 后续访问会被浏览器缓存

### 移动端优化
- 已设置 `scaleMobile: 1.00`
- 触摸控制已启用
- 在低性能设备上可能需要降低参数

## 可调整参数

如需调整动画效果，可修改以下参数：

```javascript
VANTA.NET({
    el: "#vanta-bg",
    color: 0x4ade80,           // 连线颜色
    backgroundColor: 0xf0fdf4, // 背景颜色
    points: 8.00,              // 点数量 (更多 = 更密集)
    maxDistance: 18.00,        // 连线距离 (更大 = 更多连线)
    spacing: 18.00,            // 间距 (更小 = 更密集)
})
```

## 浏览器兼容性

✅ Chrome/Edge (推荐)
✅ Firefox
✅ Safari (需要 -webkit-backdrop-filter)
⚠️ IE11 (不支持，会降级为纯色背景)

## 注意事项

1. **性能影响**：Vanta.js 使用 WebGL 渲染，在低端设备上可能影响性能
2. **备用方案**：如果 Vanta.js 加载失败，会显示原有的纯色背景
3. **z-index 层级**：确保所有模态框和浮动元素的 z-index > 0

## 后续优化

- [ ] 添加加载动画，在 Vanta.js 初始化前显示
- [ ] 根据用户设备性能动态调整参数
- [ ] 添加用户偏好设置，允许关闭动画
- [ ] 考虑添加其他 Vanta.js 效果（WAVES, BIRDS, FOG 等）

## 相关文档

- [Vanta.js 官方文档](https://www.vantajs.com/)
- [Three.js 文档](https://threejs.org/)
