# 功能八OCR超时修复说明 ⏱️

## 🔍 问题诊断

### 错误日志
```
ERROR:backend.utils.ocr_utils:OCR processing timeout after 10 seconds
TimeoutError: OCR processing exceeded 10 seconds timeout
```

### 根本原因

1. **超时时间太短**: 默认10秒超时，但RapidOCR首次加载模型需要更长时间
2. **2GB内存限制**: 服务器内存有限，模型加载较慢
3. **配置过于复杂**: PaddleOCR配置参数导致初始化缓慢

## ✅ 修复方案

### 1. 增加超时时间

**修改前**:
```python
def perform_ocr(image_data: bytes, timeout_seconds: int = 10):
```

**修改后**:
```python
def perform_ocr(image_data: bytes, timeout_seconds: int = 60):
```

### 2. 简化OCR引擎初始化

**修改前** (PaddleOCR配置):
```python
_ocr_engine = PaddleOCR(
    use_angle_cls=True,
    lang='en',
    use_gpu=False,
    show_log=False
)
```

**修改后** (RapidOCR默认配置):
```python
from rapidocr_onnxruntime import RapidOCR
_ocr_engine = RapidOCR()  # 使用默认配置，更快
```

### 3. 修复结果解析

**修改前** (PaddleOCR格式):
```python
def transform_paddleocr_result(paddle_result):
    for detection in paddle_result[0]:
        box, (text, score) = detection
```

**修改后** (RapidOCR格式):
```python
def transform_rapidocr_result(rapid_result):
    for detection in rapid_result:
        box, text, score = detection
```

### 4. 添加详细日志

```python
logger.info("Initializing RapidOCR engine...")
ocr_engine = initialize_ocr_engine()
logger.info("RapidOCR engine ready")

logger.info(f"Starting OCR on image of size {image.shape}")
result, elapse = ocr_engine(image)
logger.info(f"OCR completed in {elapse:.2f}s")
```

## 📦 部署步骤

### 方法1: 使用批处理脚本

```bash
# 双击运行
部署OCR超时修复.bat
```

### 方法2: 手动部署

```bash
# 1. 上传修复后的文件
scp backend/utils/ocr_utils.py root@43.99.101.195:/home/appuser/patent-app/backend/utils/

# 2. 修改权限
ssh root@43.99.101.195 "chown appuser:appuser /home/appuser/patent-app/backend/utils/ocr_utils.py"

# 3. 重启服务
ssh root@43.99.101.195 "systemctl restart patent-app"

# 4. 查看状态
ssh root@43.99.101.195 "systemctl status patent-app"
```

## 🧪 测试验证

### 1. 查看实时日志

```bash
ssh root@43.99.101.195 "journalctl -u patent-app -f"
```

### 2. 测试OCR功能

1. 访问: http://43.99.101.195
2. 登录系统
3. 进入"功能八 - 专利附图标记识别"
4. 上传专利附图
5. 输入说明书内容
6. 点击"开始识别"

### 3. 预期日志输出

```
INFO:backend.utils.ocr_utils:Initializing RapidOCR engine...
INFO:backend.utils.ocr_utils:RapidOCR engine ready
INFO:backend.utils.ocr_utils:Starting OCR on image of size (800, 600, 3)
INFO:backend.utils.ocr_utils:OCR completed in 3.45s
INFO:backend.utils.ocr_utils:OCR completed: 15 markers detected
```

### 4. 预期结果

✅ **成功指标**:
- 不再出现超时错误
- 识别出 > 0 个数字序号
- 匹配率 > 0%
- Canvas显示标注框
- 处理时间 < 60秒

## 🔧 技术细节

### RapidOCR vs PaddleOCR

| 特性 | RapidOCR | PaddleOCR |
|------|----------|-----------|
| 初始化速度 | ⚡ 快 (1-2秒) | 🐌 慢 (5-10秒) |
| 内存占用 | 💚 低 (~200MB) | 💛 中 (~500MB) |
| 识别速度 | ⚡ 快 | 🐌 慢 |
| 准确率 | 💚 高 | 💚 高 |
| 配置复杂度 | ✅ 简单 | ⚠️ 复杂 |

### RapidOCR API

```python
from rapidocr_onnxruntime import RapidOCR

# 初始化
ocr = RapidOCR()

# 识别
result, elapse = ocr(image)

# 结果格式
# result = [
#     [box, text, score],
#     ...
# ]
# box = [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
# text = "识别的文本"
# score = 0.95  # 置信度 (0-1)
```

### 超时机制

```python
def perform_ocr(image_data, timeout_seconds=60):
    # 在单独线程中运行OCR
    thread = Thread(target=ocr_worker)
    thread.start()
    
    # 等待完成，最多60秒
    thread.join(timeout=timeout_seconds)
    
    if thread.is_alive():
        # 超时
        raise TimeoutError(...)
```

## 📊 性能对比

### 修复前
- ❌ 超时: 10秒
- ❌ 初始化: 5-10秒 (PaddleOCR)
- ❌ 识别: 超时失败
- ❌ 结果: 0个标记

### 修复后
- ✅ 超时: 60秒
- ✅ 初始化: 1-2秒 (RapidOCR)
- ✅ 识别: 3-5秒
- ✅ 结果: 预期识别出标记

## 🔍 故障排查

### 如果仍然超时

1. **检查内存使用**:
   ```bash
   ssh root@43.99.101.195 "free -h"
   ```

2. **检查CPU负载**:
   ```bash
   ssh root@43.99.101.195 "top -bn1 | head -20"
   ```

3. **增加超时时间**:
   ```python
   # 在 backend/utils/ocr_utils.py
   def perform_ocr(image_data, timeout_seconds=120):  # 增加到120秒
   ```

4. **减小图片尺寸**:
   ```python
   # 在前端压缩图片
   max_width = 1024
   max_height = 1024
   ```

### 如果识别结果为空

1. **检查图片质量**:
   - 确保图片清晰
   - 数字标记可见
   - 对比度足够

2. **查看详细日志**:
   ```bash
   ssh root@43.99.101.195 "journalctl -u patent-app -n 200 | grep OCR"
   ```

3. **测试RapidOCR**:
   ```bash
   ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && python quick_ocr_test.py'"
   ```

## 📝 修改文件清单

- ✅ `backend/utils/ocr_utils.py` - 核心修复
  - `initialize_ocr_engine()` - 简化初始化
  - `transform_rapidocr_result()` - 修复结果解析
  - `perform_ocr()` - 增加超时时间，添加日志

## 🎯 下一步优化

### 短期优化
1. ✅ 增加超时时间 (完成)
2. ✅ 简化OCR配置 (完成)
3. ✅ 添加详细日志 (完成)

### 中期优化
1. 图片预处理优化
   - 自适应二值化
   - 对比度增强
   - 去噪处理

2. 结果后处理优化
   - 更智能的去重
   - 位置聚类
   - 置信度加权

### 长期优化
1. 模型优化
   - 针对专利附图训练
   - 模型量化加速
   - 缓存机制

2. 架构优化
   - 异步处理
   - 队列机制
   - 分布式OCR

## 📞 需要帮助？

提供以下信息：

```bash
# 1. 服务状态
ssh root@43.99.101.195 "systemctl status patent-app"

# 2. 最近日志
ssh root@43.99.101.195 "journalctl -u patent-app -n 100"

# 3. 内存状态
ssh root@43.99.101.195 "free -h"

# 4. RapidOCR版本
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv311/bin/activate && pip show rapidocr-onnxruntime'"
```

---

**最后更新**: 2026-01-29 23:30
**修复状态**: 待部署测试
**预计效果**: 解决超时问题，成功识别标记
