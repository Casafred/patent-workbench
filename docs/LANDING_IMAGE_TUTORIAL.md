# Landing 页面图片设置教程

本文档说明如何为 `frontend/landing.html` 首页设置和替换图片。

---

## 一、图片格式与尺寸规范

| 图片类型 | 推荐尺寸 | 推荐格式 | 文件大小 |
|---------|---------|---------|---------|
| Hero 背景图 | 1920×1080px 或更高 | WebP（优先）、PNG、JPG | < 500KB |
| 功能卡片截图 | 640×400px（16:10） | WebP、PNG | < 200KB |
| 演示区大图 | 1920×1080px（16:9） | WebP、PNG | < 500KB |

### 格式选择建议
- **WebP**：比 PNG/JPG 小 25-35%，推荐优先使用
- **PNG**：需要透明背景时使用
- **JPG**：照片类图片可使用

---

## 二、设置 Hero 区域背景图片

Hero 区域是首页首屏的大背景区域，可以设置功能截图作为渐变背景。

### 方法一：修改 JavaScript（推荐）

在 `landing.html` 文件的 `<script>` 标签内，找到以下位置并添加代码：

```javascript
// ============================================
// 设置 Hero 背景图片
// ============================================
document.getElementById('hero-bg-image').style.backgroundImage = 
    "url('frontend/images/your-screenshot.webp')";
```

### 方法二：修改 CSS

在 `landing.html` 的 `<style>` 标签内，找到 `.hero-bg-image` 样式：

```css
.hero-bg-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    opacity: 0.3;
    filter: blur(2px);
    /* 添加这行 */
    background-image: url('frontend/images/your-screenshot.webp');
}
```

### 背景效果调整

| CSS 属性 | 作用 | 调整建议 |
|---------|------|---------|
| `opacity` | 背景透明度 | 0.1-0.5 之间，数值越大图片越明显 |
| `filter: blur()` | 模糊程度 | 0-5px，数值越大越模糊 |
| `background-position` | 图片位置 | center、top、bottom 等 |

---

## 三、替换功能卡片截图

每个功能卡片底部都有截图区域，需要将占位符替换为实际图片。

### 步骤

1. 将截图放入 `frontend/images/screenshots/` 目录（需创建）

2. 找到对应的功能卡片 HTML，将占位符替换为图片：

**替换前：**
```html
<div class="feature-image">
    <div class="feature-image-placeholder">
        <svg>...</svg>
        <div>功能截图位置</div>
    </div>
</div>
```

**替换后：**
```html
<div class="feature-image">
    <img src="frontend/images/screenshots/feature-01.webp" 
         alt="即时对话功能截图"
         loading="lazy">
</div>
```

### 功能卡片对应表

| 序号 | 功能名称 | 建议文件名 |
|-----|---------|-----------|
| 01 | 即时对话 | feature-01.webp |
| 02 | 文本批量智能分析 | feature-02.webp |
| 03 | 本地专利库 | feature-03.webp |
| 04 | 权利要求对比 | feature-04.webp |
| 05 | 批量专利查询解读 | feature-05.webp |
| 06 | 权利要求分析器 | feature-06.webp |
| 07 | 专利附图标记 | feature-07.webp |
| 08 | PDF-OCR阅读器 | feature-08.webp |
| 09 | 同族权利要求对比 | feature-09.webp |

---

## 四、替换演示区截图

演示区位于功能卡片下方，展示4个产品截图。

### 步骤

1. 将截图放入 `frontend/images/demo/` 目录（需创建）

2. 找到 `demo-showcase` 区域，替换占位符：

**替换前：**
```html
<div class="demo-item animate-on-scroll">
    <div class="demo-item-inner">
        <div class="demo-item-content">
            <svg>...</svg>
            <div>演示截图 1</div>
        </div>
    </div>
    ...
</div>
```

**替换后：**
```html
<div class="demo-item animate-on-scroll">
    <img src="frontend/images/demo/demo-01.webp" 
         alt="即时对话界面"
         style="width:100%;height:100%;object-fit:cover;">
    <div class="demo-item-overlay">
        <div class="demo-item-title">即时对话界面</div>
        <div class="demo-item-desc">AI智能问答，支持联网搜索</div>
    </div>
</div>
```

---

## 五、性能优化建议

### 1. 图片压缩
- 使用 [TinyPNG](https://tinypng.com/) 或 [Squoosh](https://squoosh.app/) 压缩图片
- WebP 格式优先

### 2. 懒加载
- 非首屏图片添加 `loading="lazy"` 属性
- Hero 背景图不应使用懒加载

### 3. CDN 加速
- 将图片上传到 CDN
- 修改图片路径为 CDN 地址

### 4. 响应式图片
```html
<picture>
    <source srcset="frontend/images/demo/demo-01-mobile.webp" media="(max-width: 768px)">
    <source srcset="frontend/images/demo/demo-01.webp" type="image/webp">
    <img src="frontend/images/demo/demo-01.jpg" alt="演示截图">
</picture>
```

---

## 六、目录结构建议

```
frontend/
├── images/
│   ├── ALFRED X IP LOGO.webp
│   ├── hero-bg.webp              # Hero背景图
│   ├── screenshots/              # 功能截图目录
│   │   ├── feature-01.webp
│   │   ├── feature-02.webp
│   │   └── ...
│   └── demo/                     # 演示截图目录
│       ├── demo-01.webp
│       ├── demo-02.webp
│       └── ...
├── landing.html
├── help.html
└── ...
```

---

## 七、常见问题

### Q: 图片不显示？
1. 检查文件路径是否正确
2. 检查文件名大小写（Linux服务器区分大小写）
3. 检查文件格式是否支持

### Q: 图片加载慢？
1. 压缩图片文件大小
2. 使用 WebP 格式
3. 考虑使用 CDN

### Q: 图片显示变形？
确保 CSS 中设置了 `object-fit: cover`：
```css
img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
```

---

## 八、截图建议

### 截图内容建议
- 展示核心功能界面
- 突出产品特色
- 界面清晰，文字可读

### 截图技巧
1. 使用浏览器开发者工具模拟统一尺寸
2. 截图时隐藏敏感信息
3. 保持界面整洁，关闭不必要的面板
4. 使用高分辨率截图

---

*最后更新：2025年*
