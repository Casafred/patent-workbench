# OCR和交互式标注功能说明

## 已修复的问题

### 1. OCR elapse格式化错误
**问题**：RapidOCR返回的`elapse`可能是None、float或list，直接格式化会报错
**修复**：
```python
# 修复前
logger.info(f"OCR completed in {elapse:.2f}s")  # 如果elapse是list会报错

# 修复后
if elapse is not None:
    if isinstance(elapse, (list, tuple)):
        total_time = sum(elapse) if elapse else 0
        logger.info(f"OCR completed in {total_time:.2f}s")
    else:
        logger.info(f"OCR completed in {elapse:.2f}s")
else:
    logger.info("OCR completed")
```

### 2. OCR置信度转换错误
**问题**：RapidOCR返回的`score`是字符串，`float(score * 100)`会先将字符串重复100次
**修复**：
```python
# 修复前
'confidence': float(score * 100)  # 错误：'0.7' * 100 = '0.70.70.7...'

# 修复后
confidence_score = float(score) * 100 if isinstance(score, str) else score * 100
```

## 交互式标注功能

### 功能特性
1. **标注偏移显示** - 标注框自动偏移60像素，不遮挡原始标记
2. **可拖动标注** - 鼠标点击拖动标注框到任意位置
3. **连线指向** - 虚线实时连接标注框和原始识别位置
4. **可编辑标注** - 双击标注框可以修改部件名称
5. **视觉反馈** - 绿色/蓝色/橙色三种状态，清晰的交互提示
6. **导出功能** - 导出包含所有标注的PNG图片

### 使用方法
1. 上传专利附图
2. 系统自动OCR识别数字标记
3. 拖动标注框调整位置
4. 双击标注框编辑名称
5. 点击"导出图片"保存结果

### 交互操作
- **拖动**：点击标注框拖动，连线实时跟随
- **编辑**：双击标注框弹出编辑对话框
- **悬停**：鼠标悬停时橙色高亮
- **选中**：点击后蓝色高亮，显示操作提示

## 部署方法

### 快速部署
运行部署脚本：
```batch
重新部署OCR和交互式标注.bat
```

### 手动部署
```bash
# 1. 上传OCR修复
scp backend/utils/ocr_utils.py root@43.99.101.195:/home/appuser/patent-app/backend/utils/

# 2. 上传交互式标注JS
scp js/drawingMarkerInteractive.js root@43.99.101.195:/home/appuser/patent-app/js/

# 3. 上传index.html
scp frontend/index.html root@43.99.101.195:/home/appuser/patent-app/frontend/

# 4. 重启服务
ssh root@43.99.101.195 "chown -R appuser:appuser /home/appuser/patent-app && systemctl restart patent-app"
```

## 测试步骤

### 1. 测试OCR识别
1. 访问 http://43.99.101.195
2. 进入功能八（专利附图标记识别）
3. 上传 `tests/test patent pic.png` 或 `tests/2,0439e17894683f41_full.gif`
4. 查看识别结果，应该能识别出数字标记

### 2. 测试交互式标注
1. 识别完成后，查看标注框是否偏移显示（不遮挡数字）
2. 尝试拖动标注框，查看连线是否跟随
3. 双击标注框，修改部件名称
4. 点击"导出图片"，下载标注结果

### 3. 查看日志
```bash
ssh root@43.99.101.195 "journalctl -u patent-app -f"
```

应该看到类似日志：
```
OCR completed in 0.48s
OCR completed: 9 markers detected
```

## 技术细节

### OCR引擎
- 使用 RapidOCR 1.4.4
- Python 3.11 环境
- 虚拟环境：`/home/appuser/patent-app/venv311`

### 返回格式
RapidOCR返回格式：
```python
result = [
    [[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], '识别文本', '0.95'],
    ...
]
elapse = [0.421, 0.003, 0.062]  # 或 None
```

### 交互式标注类
位置：`js/drawingMarkerInteractive.js`
主要方法：
- `constructor()` - 初始化画布和数据
- `drawAnnotations()` - 绘制所有标注
- `handleMouseDown()` - 处理拖动开始
- `handleMouseMove()` - 处理拖动中
- `handleMouseUp()` - 处理拖动结束
- `handleDoubleClick()` - 处理编辑
- `exportImage()` - 导出图片

## 常见问题

### Q: OCR识别不出数字？
A: 检查：
1. 图片是否清晰
2. 数字是否足够大
3. 查看日志确认OCR是否正常运行

### Q: 标注框无法拖动？
A: 检查：
1. 浏览器控制台是否有JS错误
2. 按 Ctrl+F5 清除缓存
3. 确认 `drawingMarkerInteractive.js` 已加载

### Q: 双击无法编辑？
A: 检查：
1. 是否双击在标注框上（不是连线）
2. 浏览器是否阻止了弹窗

## 文件清单

### 后端文件
- `backend/utils/ocr_utils.py` - OCR工具（已修复）

### 前端文件
- `js/drawingMarkerInteractive.js` - 交互式标注类
- `frontend/index.html` - 主页面（引用交互式标注）

### 测试文件
- `tests/test patent pic.png` - 测试图片1
- `tests/2,0439e17894683f41_full.gif` - 测试图片2

## 版本信息

- OCR修复版本：v2.0 (20260131)
- 交互式标注版本：v1.0 (20260130)
- Python环境：3.11
- RapidOCR版本：1.4.4
