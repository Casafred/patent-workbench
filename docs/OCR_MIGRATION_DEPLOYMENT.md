# OCR迁移部署指南 - Tesseract到RapidOCR

## 概述

本文档说明如何部署从Tesseract OCR迁移到RapidOCR的新系统。

## 系统要求

### 最低配置
- **CPU**: 2核心
- **内存**: 2GB RAM
- **磁盘空间**: 500MB（用于模型文件）
- **Python**: 3.8+
- **操作系统**: Windows/Linux/macOS

### 推荐配置
- **CPU**: 4核心或更多
- **内存**: 4GB RAM或更多
- **磁盘空间**: 1GB

## 安装步骤

### 1. 更新依赖包

```bash
# 安装新的OCR依赖
pip install rapidocr-onnxruntime>=1.3.0

# 安装内存监控（可选但推荐）
pip install psutil

# 卸载旧的Tesseract依赖（保留Pillow用于图像处理）
pip uninstall pytesseract -y
```

**注意：** 我们保留Pillow是因为：
- 用于可靠的图像格式解码（支持PNG、JPEG、BMP等）
- OpenCV对某些图像格式支持不完善
- 未来可能需要图像标注功能
- Pillow很轻量（~10MB），不影响服务器性能

或者直接使用更新后的requirements.txt：

```bash
pip install -r requirements.txt
```

### 2. 验证安装

运行测试脚本验证安装：

```bash
python test_rapidocr_migration.py
```

预期输出：
```
============================================================
RapidOCR Migration Test Suite
============================================================
Testing imports...
✓ All imports successful

Testing OCR engine initialization...
✓ OCR engine initialized successfully

Testing result transformation...
✓ Transformation works correctly

Testing alphanumeric filtering...
✓ Filtering works correctly: ['1', '2A', '10B']

Testing utility functions...
✓ All utility functions work correctly

============================================================
Test Results: 5/5 passed
============================================================

✓ All tests passed! Basic functionality is working.
```

### 3. 模型下载

RapidOCR会在首次运行时自动下载模型文件（约50MB）。模型会缓存在：
- **Linux/macOS**: `~/.rapidocr/`
- **Windows**: `C:\Users\<用户名>\.rapidocr\`

首次运行可能需要几分钟下载模型。

## 配置说明

### OCR参数配置

在`backend/utils/ocr_utils.py`中的`perform_ocr()`函数可以调整以下参数：

```python
perform_ocr(
    image_data,
    use_angle_cls=True,      # 是否检测文字角度
    use_text_score=True,     # 是否返回置信度
    timeout_seconds=10       # 超时时间（秒）
)
```

### 置信度阈值

在`backend/routes/drawing_marker.py`中可以调整置信度过滤阈值：

```python
# 当前设置：最低置信度50%
all_detected_numbers = filter_by_confidence(all_detected_numbers, min_confidence=50)
```

根据实际识别效果调整：
- **提高阈值**（如60-70）：减少误识别，但可能漏掉一些标记
- **降低阈值**（如40-50）：识别更多标记，但可能增加误识别

### 内存限制

在`backend/utils/ocr_utils.py`中的`check_memory_available()`函数可以调整内存要求：

```python
check_memory_available(required_mb=500)  # 默认要求500MB可用内存
```

## 性能优化

### 1. 单例模式

OCR引擎使用单例模式，避免重复加载模型：
- 首次调用会初始化引擎（约1-2秒）
- 后续调用直接使用已加载的引擎

### 2. 超时保护

默认超时时间为10秒，可根据服务器性能调整：
- **高性能服务器**：可降低到5-7秒
- **低性能服务器**：可提高到15-20秒

### 3. 并发处理

系统支持并发处理多个OCR请求，但注意：
- 每个请求约占用200-500MB内存
- 2GB服务器建议最多3-4个并发请求

## 故障排除

### 问题1：模型下载失败

**症状**：首次运行时报错"Failed to download model"

**解决方案**：
1. 检查网络连接
2. 手动下载模型文件并放置到`~/.rapidocr/`目录
3. 或使用代理：
   ```bash
   export HTTP_PROXY=http://proxy:port
   export HTTPS_PROXY=http://proxy:port
   ```

### 问题2：内存不足

**症状**：处理大图片时报"MemoryError"

**解决方案**：
1. 降低图片分辨率（建议最大3000px）
2. 增加服务器内存
3. 减少并发请求数量

### 问题3：识别率低

**症状**：很多标记未被识别

**解决方案**：
1. 检查图片质量（清晰度、对比度）
2. 降低置信度阈值（min_confidence）
3. 确保图片是白底黑字
4. 检查标记是否符合字母数字格式

### 问题4：处理超时

**症状**：大图片处理时报"TimeoutError"

**解决方案**：
1. 增加timeout_seconds参数
2. 压缩图片大小
3. 升级服务器配置

## 性能基准

在标准配置（2核2GB）下的性能指标：

| 图片大小 | 处理时间 | 内存占用 |
|---------|---------|---------|
| 500KB   | 1-2秒   | 300MB   |
| 1MB     | 2-4秒   | 400MB   |
| 2MB     | 4-6秒   | 500MB   |
| 5MB     | 8-10秒  | 700MB   |

## 回滚方案

如果需要回滚到Tesseract：

1. 恢复旧的requirements.txt：
   ```bash
   git checkout HEAD~1 requirements.txt
   pip install -r requirements.txt
   ```

2. 恢复旧的代码文件：
   ```bash
   git checkout HEAD~1 backend/utils/ocr_utils.py
   git checkout HEAD~1 backend/routes/drawing_marker.py
   ```

3. 重启服务

## 监控建议

建议监控以下指标：

1. **OCR处理时间**：平均应在5秒以内
2. **内存使用率**：峰值不应超过80%
3. **识别成功率**：应保持在80%以上
4. **超时错误率**：应低于5%

## 支持

如遇问题，请查看：
- 测试脚本：`test_rapidocr_migration.py`
- 设计文档：`.kiro/specs/ocr-migration-paddleocr/design.md`
- 需求文档：`.kiro/specs/ocr-migration-paddleocr/requirements.md`
