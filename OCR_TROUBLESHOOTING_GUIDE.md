# OCR识别问题排查指南

## 问题：识别不出任何标记

### 已修复的问题

**问题描述：** 上传图片后显示"识别出 0 个数字序号，匹配率 0.0%"

**根本原因：** RapidOCR返回格式处理错误
- RapidOCR实际返回: `(detections_list, timings_tuple)`
- 代码期望: 直接的`detections_list`

**修复方案：** 更新 `backend/utils/ocr_utils.py` 中的 `transform_rapidocr_result()` 函数

**修复状态：** ✅ 已修复并推送到Git

### 部署修复

如果服务器上仍然识别不出，请执行以下命令更新：

```bash
# 方法1: 一键更新（推荐）
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git pull origin main' && systemctl restart patent-app"

# 方法2: 手动更新
ssh root@43.99.101.195
su - appuser
cd ~/patent-app
git pull origin main
exit
systemctl restart patent-app
```

### 验证修复

1. **本地测试**
```bash
python -c "from backend.utils.ocr_utils import perform_ocr; from PIL import Image, ImageDraw; from io import BytesIO; img = Image.new('RGB', (400, 200), 'white'); draw = ImageDraw.Draw(img); draw.text((50, 50), '123', fill='black'); buf = BytesIO(); img.save(buf, 'PNG'); result = perform_ocr(buf.getvalue()); print(f'识别到 {len(result)} 个标记'); print(result)"
```

预期输出：
```
识别到 1 个标记
[{'number': '123', 'x': 59, 'y': 57, 'width': 21, 'height': 14, 'confidence': 74.8}]
```

2. **服务器测试**
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv/bin/activate && python -c \"from backend.utils.ocr_utils import perform_ocr; print(\\\"OCR模块加载成功\\\")\"'"
```

3. **Web界面测试**
- 访问功能八（附图标记识别）
- 上传测试图片
- 输入说明书文本
- 点击识别
- 检查是否能识别出标记

## 其他可能的问题

### 问题1: 识别率低（识别到一些但不全）

**可能原因：**
1. 置信度阈值过高
2. 图片质量问题
3. 标记过滤过于严格

**解决方案：**

1. **降低置信度阈值**
   
   编辑 `backend/routes/drawing_marker.py`:
   ```python
   # 当前设置：最低置信度50%
   all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=50)
   
   # 可以降低到30-40%
   all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=30)
   ```

2. **检查图片质量**
   - 确保图片清晰
   - 白底黑字效果最好
   - 避免过度压缩
   - 建议分辨率：至少1000px宽

3. **放宽过滤规则**
   
   编辑 `backend/utils/ocr_utils.py` 中的 `filter_alphanumeric_markers()`:
   ```python
   # 当前正则：只允许数字+字母组合
   pattern = re.compile(r'^[0-9]+[A-Za-z]*$|^[A-Z]+[0-9]*[a-z]*$', re.IGNORECASE)
   
   # 可以放宽为：允许更多字符
   pattern = re.compile(r'^[0-9A-Za-z]+$', re.IGNORECASE)
   ```

### 问题2: 识别到错误的标记

**可能原因：**
1. 图片中有其他文字干扰
2. 置信度阈值过低
3. 过滤规则过于宽松

**解决方案：**

1. **提高置信度阈值**
   ```python
   all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=60)
   ```

2. **加强过滤规则**
   - 限制标记长度（如最多4个字符）
   - 只允许特定格式（如纯数字）

### 问题3: 处理超时

**可能原因：**
1. 图片太大
2. 服务器性能不足
3. 超时设置过短

**解决方案：**

1. **增加超时时间**
   
   编辑 `backend/utils/ocr_utils.py`:
   ```python
   # 当前：10秒
   results = perform_ocr(image_data, timeout_seconds=10)
   
   # 可以增加到20-30秒
   results = perform_ocr(image_data, timeout_seconds=30)
   ```

2. **压缩图片**
   - 建议最大尺寸：3000px
   - 建议文件大小：< 2MB

3. **优化服务器**
   - 增加内存
   - 减少并发请求

### 问题4: 内存不足

**症状：** 服务崩溃或返回500错误

**解决方案：**

1. **减少worker数量**
   ```bash
   # 编辑systemd服务文件
   sudo nano /etc/systemd/system/patent-app.service
   
   # 修改workers数量
   # 从: gunicorn --workers 4 ...
   # 改为: gunicorn --workers 2 ...
   
   sudo systemctl daemon-reload
   sudo systemctl restart patent-app
   ```

2. **调整内存限制**
   
   编辑 `backend/utils/ocr_utils.py`:
   ```python
   # 降低内存要求
   check_memory_available(required_mb=300)  # 从500降到300
   ```

## 调试技巧

### 1. 查看服务器日志

```bash
# 实时查看日志
ssh root@43.99.101.195 "journalctl -u patent-app -f"

# 查看最近50行
ssh root@43.99.101.195 "journalctl -u patent-app -n 50"

# 查看错误日志
ssh root@43.99.101.195 "journalctl -u patent-app -p err -n 50"
```

### 2. 启用调试输出

在 `backend/routes/drawing_marker.py` 中已有调试输出：
```python
print(f"[DEBUG] OCR detected {len(all_detected_numbers)} markers")
print(f"[DEBUG] Detected numbers: {[d['number'] for d in all_detected_numbers]}")
```

查看这些输出可以了解识别过程。

### 3. 测试单个图片

创建测试脚本 `test_single_image.py`:
```python
from backend.utils.ocr_utils import perform_ocr

# 读取图片
with open('your_test_image.png', 'rb') as f:
    image_data = f.read()

# 执行OCR
results = perform_ocr(image_data)

print(f"识别到 {len(results)} 个标记:")
for r in results:
    print(f"  {r['number']} (置信度: {r['confidence']:.1f}%)")
```

### 4. 检查RapidOCR版本

```bash
pip show rapidocr-onnxruntime
```

确保版本 >= 1.3.0

## 性能优化建议

### 1. 图片预处理

如果识别率低，可以添加图片预处理：

```python
# 在 perform_ocr() 中添加
import cv2

# 增强对比度
img_gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
img_enhanced = cv2.equalizeHist(img_gray)

# 二值化
_, img_binary = cv2.threshold(img_enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
```

### 2. 调整RapidOCR参数

```python
# 在 perform_ocr() 中
result = ocr_engine(
    image, 
    use_det=True,      # 文本检测
    use_cls=True,      # 方向分类
    use_rec=True,      # 文本识别
    det_db_thresh=0.3, # 检测阈值（降低可识别更多）
    det_db_box_thresh=0.5  # 框阈值
)
```

### 3. 批量处理优化

如果需要处理多张图片：
- 复用OCR引擎（已实现单例模式）
- 控制并发数量（2-3个）
- 添加进度反馈

## 常见错误代码

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `识别出 0 个数字序号` | RapidOCR返回格式问题 | 已修复，更新代码 |
| `TimeoutError` | 处理超时 | 增加timeout_seconds |
| `MemoryError` | 内存不足 | 减少worker或增加内存 |
| `ValueError: Invalid image data` | 图片格式错误 | 检查图片是否损坏 |
| `RuntimeError: OCR engine initialization failed` | 模型加载失败 | 检查~/.rapidocr/目录 |

## 联系支持

如果问题仍未解决：

1. 收集以下信息：
   - 服务器日志（最近50行）
   - 测试图片（如果可以分享）
   - 错误截图
   - Python版本和依赖版本

2. 运行诊断脚本：
   ```bash
   python diagnose_ocr_issue.py > ocr_diagnosis.txt 2>&1
   ```

3. 查看相关文档：
   - `OCR_MIGRATION_READY_TO_DEPLOY.md`
   - `SERVER_DEPLOYMENT_GUIDE.md`
   - `OCR_MIGRATION_DEPLOYMENT.md`
