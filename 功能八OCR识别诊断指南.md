# 功能八OCR识别问题诊断指南

## 问题概述

**症状**: 功能八（专利附图标记识别）上传图片和说明书后，识别结果显示"共识别出 0 个数字序号，匹配率 0%"

**已确认**:
- ✅ Tesseract OCR 4.1.1 已安装在服务器 `/usr/bin/tesseract`
- ✅ Python依赖已安装: pytesseract==0.3.7, Pillow==8.4.0
- ✅ 应用服务正常运行，无错误日志
- ✅ API调用成功 (POST 200)
- ✅ 说明书文本解析正常 (reference_map有内容)
- ❌ **OCR图像识别完全失败** (detected_numbers为空数组)

**API响应示例**:
```json
{
  "success": true,
  "data": {
    "total_numbers": 0,
    "match_rate": 0,
    "reference_map": {"1": "...", "2": "...", "3": "..."},
    "missing_markers": ["1", "2", "3"],
    "drawings": [
      {
        "detected_numbers": [],
        "name": "test patent pic.png"
      }
    ]
  }
}
```

## 根本原因分析

OCR识别率为0可能的原因:

1. **图像预处理不当**: 当前使用Pillow的预处理可能不如opencv效果好
2. **Tesseract配置不优**: PSM模式、OEM模式或字符白名单可能不适合专利附图
3. **图像质量问题**: 测试图片可能分辨率太低、对比度不足或数字太小
4. **字体识别问题**: 专利附图中的数字字体可能需要特殊处理

## 诊断方案

我已经创建了一个全面的OCR诊断脚本 `test_ocr_on_server.py`，它会:

### 测试内容

1. **6种Tesseract配置**:
   - 默认配置
   - PSM 6 (假设单列文本) + 数字字母白名单
   - PSM 11 (稀疏文本) + 数字字母白名单
   - PSM 6 + 仅数字白名单
   - PSM 11 + 仅数字白名单
   - PSM 3 (全自动分页) + 数字字母白名单

2. **13种图像预处理方法**:
   - 原始灰度图
   - 对比度增强 (1.5x, 2.0x, 2.5x)
   - 锐化
   - 二值化 (阈值: 100, 127, 150, 180)
   - 图像放大 (1.5x, 2.0x)
   - 组合优化 (放大 + 对比度增强 + 锐化)

3. **总共测试**: 6 × 13 = 78 种组合

### 输出信息

- 每种组合的识别数量
- 识别到的具体数字和置信度
- 最佳配置推荐
- 详细的识别结果（包括位置坐标）

## 执行步骤

### 方法1: 分步执行

```bash
# 1. 上传诊断脚本
scp test_ocr_on_server.py root@43.99.101.195:/home/appuser/patent-app/

# 2. 上传测试图片（使用你在前端测试时用的图片）
scp "tests/test patent pic.png" root@43.99.101.195:/home/appuser/patent-app/test_image.png

# 3. 运行诊断
ssh root@43.99.101.195 "su - appuser -c 'cd /home/appuser/patent-app && python3 test_ocr_on_server.py test_image.png'"
```

### 方法2: 一键执行

```bash
scp test_ocr_on_server.py root@43.99.101.195:/home/appuser/patent-app/ && \
scp "tests/test patent pic.png" root@43.99.101.195:/home/appuser/patent-app/test_image.png && \
ssh root@43.99.101.195 "su - appuser -c 'cd /home/appuser/patent-app && python3 test_ocr_on_server.py test_image.png'"
```

## 预期结果和后续行动

### 场景A: 找到有效配置 ✅

**诊断输出示例**:
```
✅ 对比度增强 x2.0        | 识别: 15 | 数字: 1, 2, 3, 4, 5 ... (+10)

最佳结果
配置: PSM 11 + 数字字母
预处理: 对比度增强 x2.0
识别数量: 15
```

**后续行动**:
1. 记录最佳配置参数
2. 更新 `backend/routes/drawing_marker.py`:
   - 修改 `custom_config` 变量
   - 调整图像预处理流程
   - 可能需要移除效果不好的预处理方法
3. 提交代码到Git
4. 在服务器上更新:
   ```bash
   ssh root@43.99.101.195 "su - appuser -c 'cd /home/appuser/patent-app && git pull'"
   ```
5. 重启服务:
   ```bash
   ssh root@43.99.101.195 "sudo systemctl restart patent-app"
   ```
6. 重新测试功能八

### 场景B: 所有配置都失败 ❌

**诊断输出示例**:
```
❌ 未识别到任何数字

可能的原因:
  1. 图片中没有清晰的数字
  2. 图片质量太低
  3. 数字太小或太模糊
```

**后续行动**:
1. **检查测试图片**:
   - 在本地打开图片，确认是否包含清晰可见的数字
   - 检查图片分辨率和质量
   - 尝试用其他更清晰的专利附图测试

2. **如果图片确实包含清晰数字但仍识别失败**:
   - 考虑使用更高级的预处理算法
   - 可能需要使用opencv-python (但需要升级Python版本)
   - 考虑训练自定义Tesseract模型
   - 考虑使用其他OCR引擎 (如EasyOCR, PaddleOCR)

3. **如果图片质量不足**:
   - 向用户说明图片质量要求
   - 更新用户指南，说明最佳图片规格
   - 在前端添加图片质量检查

## 技术细节

### 当前实现 (backend/routes/drawing_marker.py)

```python
# 当前使用的配置
custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

# 当前的预处理方法
1. 原始灰度图
2. 对比度增强 (2.0x)
3. 锐化
4. 二值化 (阈值=127)
```

### PSM模式说明

- **PSM 3**: 全自动分页 (默认)
- **PSM 6**: 假设单列均匀文本
- **PSM 11**: 稀疏文本，按任意顺序查找尽可能多的文本
- **PSM 13**: 原始行，将图像视为单个文本行

对于专利附图（数字分散在图中），**PSM 11** 可能是最佳选择。

### OEM模式说明

- **OEM 0**: 仅传统引擎
- **OEM 1**: 仅神经网络LSTM引擎
- **OEM 2**: 传统 + LSTM引擎
- **OEM 3**: 默认，基于可用内容

## 相关文件

- `test_ocr_on_server.py` - OCR诊断脚本
- `OCR诊断步骤.md` - 详细的诊断步骤说明
- `backend/routes/drawing_marker.py` - OCR识别主逻辑
- `backend/utils/ocr_utils.py` - OCR工具函数
- `.kiro/specs/drawing-marker-ocr-fix/tasks.md` - 任务列表

## 当前任务状态

- [x] 任务1: 修复后端OCR识别逻辑核心错误
- [x] 任务2: 实现结果去重和过滤功能
- [🔄] **任务3: 优化图像预处理和OCR配置** (当前任务)
- [x] 任务4: 增强错误处理和日志记录
- [x] 任务7: 实现识别结果验证和统计
- [x] 任务9: 修复前端数据显示

## 下一步

**请执行诊断脚本**，然后将输出结果发给我，我会根据结果:
1. 确定最佳的OCR配置
2. 更新代码实现
3. 部署并验证修复

如果诊断脚本识别成功，我们就能快速解决问题。如果失败，我们需要进一步分析图片质量或考虑其他方案。
