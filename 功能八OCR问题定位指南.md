# 功能八OCR问题定位指南

## 问题现象

```
⚠️ 成功处理 1 张图片，识别出 0 个数字序号，匹配率 0.0%
已识别 1 张附图中的数字序号，并与说明书中的附图标记对应。
共识别出 0 个数字序号，匹配率 0%。
平均识别置信度: 0%
缺失标记: 11, 13, 3, 1, 21, 23, 15, 17, 12, 31, 33, 302, 311, 2, 405, 4, 409, ...
```

## 问题分析框架

OCR识别返回0结果，可能的原因有4大类：

### 1️⃣ 配置问题（最可能）

#### 1.1 依赖库未安装
**症状**: 
- 后端启动时没有报错
- 但OCR调用时返回空结果
- 日志中可能有ImportError

**检查方法**:
```bash
# 在阿里云服务器上运行
python3 -c "import rapidocr_onnxruntime; print('✅ RapidOCR已安装')"
python3 -c "import cv2; print('✅ OpenCV已安装')"
python3 -c "from PIL import Image; print('✅ Pillow已安装')"
```

**解决方案**:
```bash
# 如果使用虚拟环境
source venv/bin/activate
pip install rapidocr-onnxruntime opencv-python Pillow

# 如果使用系统Python
pip3 install rapidocr-onnxruntime opencv-python Pillow

# 重启应用
sudo systemctl restart <服务名>
```

#### 1.2 虚拟环境问题
**症状**:
- 本地测试正常
- 服务器上返回0结果
- 依赖库安装在系统Python，但应用使用虚拟环境

**检查方法**:
```bash
# 查找虚拟环境
ls -la venv/ .venv/

# 检查应用使用的Python
ps aux | grep python | grep -v grep

# 查看进程使用的Python路径
sudo ls -l /proc/<PID>/exe
```

**解决方案**:
```bash
# 在虚拟环境中安装依赖
source venv/bin/activate
pip install -r requirements.txt
deactivate

# 重启应用
sudo systemctl restart <服务名>
```

#### 1.3 RapidOCR模型文件缺失
**症状**:
- 依赖库已安装
- 但初始化OCR引擎时失败
- 日志中有"model not found"错误

**检查方法**:
```bash
# 查找RapidOCR模型文件
python3 -c "
from rapidocr_onnxruntime import RapidOCR
import os
ocr = RapidOCR()
print('模型初始化成功')
"
```

**解决方案**:
```bash
# 重新安装RapidOCR（会自动下载模型）
pip3 uninstall rapidocr-onnxruntime -y
pip3 install rapidocr-onnxruntime

# 或手动下载模型（如果网络问题）
# 参考: https://github.com/RapidAI/RapidOCR
```

---

### 2️⃣ 图片问题

#### 2.1 图片格式/编码问题
**症状**:
- 某些图片识别正常
- 某些图片返回0结果
- 日志中有"decode error"

**检查方法**:
```python
# 在后端添加调试日志
print(f"[DEBUG] Image data length: {len(image_data)}")
print(f"[DEBUG] Image data type: {type(image_data)}")
print(f"[DEBUG] First 20 bytes: {image_data[:20]}")

# 尝试解码
from PIL import Image
from io import BytesIO
img = Image.open(BytesIO(image_data))
print(f"[DEBUG] Image size: {img.size}, mode: {img.mode}")
```

**解决方案**:
- 前端确保正确的base64编码
- 后端添加图片格式验证
- 支持多种图片格式（PNG, JPEG, GIF）

#### 2.2 图片质量问题
**症状**:
- 图片模糊、对比度低
- 数字标记太小或太大
- 背景复杂

**检查方法**:
```python
# 检查图片质量
import cv2
import numpy as np

# 计算图片清晰度（拉普拉斯方差）
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
print(f"[DEBUG] Image sharpness: {laplacian_var}")
# 通常 > 100 表示清晰，< 50 表示模糊

# 计算对比度
contrast = gray.std()
print(f"[DEBUG] Image contrast: {contrast}")
```

**解决方案**:
```python
# 图片预处理增强
def enhance_image(image):
    # 转灰度
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # 增强对比度
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(gray)
    
    # 二值化
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return binary
```

#### 2.3 图片中确实没有可识别的数字
**症状**:
- 图片是示意图、流程图
- 没有清晰的数字标记
- 标记是中文或特殊符号

**检查方法**:
- 人工查看上传的图片
- 确认是否包含数字标记

**解决方案**:
- 提示用户上传包含数字标记的附图
- 前端添加图片预览功能

---

### 3️⃣ 代码问题

#### 3.1 OCR结果转换错误
**症状**:
- OCR引擎返回了结果
- 但transform函数处理后变成空数组

**检查方法**:
```python
# 在ocr_utils.py中添加调试日志
def transform_rapidocr_result(rapid_result):
    print(f"[DEBUG] Raw OCR result type: {type(rapid_result)}")
    print(f"[DEBUG] Raw OCR result: {rapid_result}")
    
    # ... 转换逻辑 ...
    
    print(f"[DEBUG] Transformed results count: {len(results)}")
    return results
```

**解决方案**:
- 检查RapidOCR返回格式是否变化
- 更新transform函数以适配新格式

#### 3.2 过滤条件太严格
**症状**:
- OCR识别到了文本
- 但被filter_alphanumeric_markers过滤掉了

**检查方法**:
```python
# 在filter_alphanumeric_markers中添加日志
def filter_alphanumeric_markers(ocr_results):
    print(f"[DEBUG] Before filter: {len(ocr_results)} results")
    for result in ocr_results:
        print(f"[DEBUG] Text: '{result['number']}'")
    
    filtered = []
    # ... 过滤逻辑 ...
    
    print(f"[DEBUG] After filter: {len(filtered)} results")
    return filtered
```

**解决方案**:
```python
# 放宽过滤条件
pattern = re.compile(r'^[0-9]+[A-Za-z]*$|^[A-Z]+[0-9]*$', re.IGNORECASE)

# 或者临时禁用过滤进行测试
def filter_alphanumeric_markers(ocr_results):
    return ocr_results  # 暂时返回所有结果
```

#### 3.3 置信度阈值太高
**症状**:
- OCR识别到了数字
- 但置信度低于阈值被过滤

**检查方法**:
```python
# 在filter_by_confidence中添加日志
def filter_by_confidence(results, min_confidence=60):
    print(f"[DEBUG] Confidence threshold: {min_confidence}")
    for r in results:
        print(f"[DEBUG] '{r['number']}' confidence: {r['confidence']}")
    
    filtered = [r for r in results if r.get('confidence', 0) >= min_confidence]
    print(f"[DEBUG] Passed confidence filter: {len(filtered)}/{len(results)}")
    return filtered
```

**解决方案**:
```python
# 降低置信度阈值
detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=30)  # 从60降到30
```

---

### 4️⃣ 说明书解析问题

#### 4.1 reference_map为空
**症状**:
- OCR识别到了数字
- 但匹配率0%，所有标记都是"缺失"

**检查方法**:
```python
# 在drawing_marker.py中添加日志
reference_map = extract_reference_markers(specification)
print(f"[DEBUG] Extracted reference_map: {reference_map}")
print(f"[DEBUG] Total markers: {len(reference_map)}")
```

**解决方案**:
```python
# 改进extract_reference_markers函数
def extract_reference_markers(spec_text):
    reference_map = {}
    
    # 支持更多格式
    patterns = [
        r'([0-9]+[A-Z]*)\s*[.、]\s*([^。；，,;\n、]+)',  # 1. 底座
        r'([0-9]+[A-Z]*)[-—]\s*([^。；，,;\n]+)',      # 1-底座
        r'([0-9]+[A-Z]*)\s+([一-龥\u4e00-\u9fa5]+)',  # 1 底座
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, spec_text)
        for match in matches:
            number = match[0]
            name = match[1].strip()
            if name and number not in reference_map:
                reference_map[number] = name
    
    return reference_map
```

---

## 诊断流程

### 第一步：运行完整诊断脚本

```bash
# 上传diagnose_ocr_complete.py到服务器
scp diagnose_ocr_complete.py user@server:/path/to/app/

# SSH连接到服务器
ssh user@server

# 进入应用目录
cd /path/to/app

# 运行诊断
python3 diagnose_ocr_complete.py
```

### 第二步：分析诊断结果

根据诊断输出，确定问题类型：

| 诊断输出 | 问题类型 | 跳转到 |
|---------|---------|--------|
| ❌ RapidOCR: 未安装 | 依赖缺失 | 1.1 |
| ❌ RapidOCR引擎初始化失败 | 模型缺失 | 1.3 |
| ✅ OCR执行完成，检测结果数量: 0 | 图片问题 | 2.1-2.3 |
| ✅ 识别到X个文本区域，其中数字标记: 0个 | 过滤问题 | 3.2 |
| ✅ perform_ocr未识别到任何标记 | 代码问题 | 3.1-3.3 |

### 第三步：应用解决方案

根据问题类型，应用对应的解决方案。

### 第四步：重启应用并测试

```bash
# 重启应用
sudo systemctl restart <服务名>

# 查看日志
tail -f logs/error.log

# 测试功能八
# 访问网站 -> 功能八 -> 上传图片 -> 查看结果
```

---

## 快速修复脚本

### 一键诊断和修复（推荐）

```bash
# 上传脚本到服务器
scp fix_ocr_aliyun.sh user@server:/path/to/app/

# SSH连接
ssh user@server

# 进入目录
cd /path/to/app

# 运行脚本
chmod +x fix_ocr_aliyun.sh
./fix_ocr_aliyun.sh
```

这个脚本会：
1. ✅ 检查Python环境
2. ✅ 检查依赖安装
3. ✅ 自动安装缺失依赖
4. ✅ 运行OCR诊断
5. ✅ 提供重启建议

---

## 调试技巧

### 1. 启用详细日志

在`backend/utils/ocr_utils.py`开头添加：

```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
```

### 2. 保存中间结果

```python
# 保存上传的图片
with open(f'/tmp/debug_image_{drawing["name"]}', 'wb') as f:
    f.write(image_data)

# 保存OCR结果
import json
with open('/tmp/debug_ocr_result.json', 'w') as f:
    json.dump(all_detected_numbers, f, indent=2, ensure_ascii=False)
```

### 3. 使用测试图片

```python
# 创建简单的测试图片
from PIL import Image, ImageDraw, ImageFont

img = Image.new('RGB', (400, 300), color='white')
draw = ImageDraw.Draw(img)
font = ImageFont.load_default()

for i, pos in enumerate([(50, 50), (150, 50), (250, 50)], 1):
    draw.text(pos, str(i), fill='black', font=font)

img.save('test_simple.png')
```

### 4. 对比本地和服务器

```bash
# 本地测试
python diagnose_ocr_complete.py > local_result.txt

# 服务器测试
ssh user@server "cd /path/to/app && python3 diagnose_ocr_complete.py" > server_result.txt

# 对比差异
diff local_result.txt server_result.txt
```

---

## 常见错误和解决方案

### 错误1: ModuleNotFoundError: No module named 'rapidocr_onnxruntime'

**原因**: RapidOCR未安装

**解决**:
```bash
pip3 install rapidocr-onnxruntime
```

### 错误2: OCR返回None

**原因**: 图片解码失败或格式不支持

**解决**:
```python
# 添加错误处理
try:
    pil_image = Image.open(BytesIO(image_data))
    if pil_image.mode not in ('RGB', 'L'):
        pil_image = pil_image.convert('RGB')
except Exception as e:
    logger.error(f"Image decode failed: {e}")
    return []
```

### 错误3: 识别到文本但都被过滤掉

**原因**: 过滤条件太严格

**解决**:
```python
# 临时禁用过滤进行测试
# filtered_results = filter_alphanumeric_markers(transformed_results)
filtered_results = transformed_results  # 跳过过滤
```

### 错误4: 虚拟环境中的依赖未生效

**原因**: 应用未使用虚拟环境的Python

**解决**:
```bash
# 确认应用使用虚拟环境
# 修改systemd服务文件或启动脚本
ExecStart=/path/to/app/venv/bin/python /path/to/app/app.py
```

---

## 总结

根据你的错误信息（识别出0个数字序号），最可能的原因是：

1. **依赖未安装**（70%概率）
   - RapidOCR未安装或未在正确的Python环境中安装
   
2. **虚拟环境问题**（20%概率）
   - 依赖安装在系统Python，但应用使用虚拟环境
   
3. **图片质量问题**（5%概率）
   - 图片模糊或对比度低
   
4. **代码逻辑问题**（5%概率）
   - 过滤条件太严格

**建议操作顺序**:
1. 运行`fix_ocr_aliyun.sh`一键诊断和修复
2. 如果问题仍存在，运行`diagnose_ocr_complete.py`详细诊断
3. 根据诊断结果，应用对应的解决方案
4. 重启应用并测试

需要我帮你进一步分析吗？
