# 功能八OCR优化 - 专利附图专用配置

## 优化内容

针对**白底黑线、小数字**的专利附图特点，进行了以下优化：

### 1. 图像放大策略 ⬆️

**问题**: 专利附图中的数字通常很小，标准尺寸下OCR难以识别

**解决方案**:
- 将图像放大到至少 **3000px**（之前是1500-3000px）
- 使用高质量的LANCZOS重采样算法
- 确保小数字有足够的像素密度供OCR识别

```python
# 放大到至少3000px
target_size = 3000
if max_dim < target_size:
    scale = target_size / max_dim
    image = image.resize((new_width, new_height), Image.LANCZOS)
```

### 2. 专用预处理方法 🎨

针对白底黑字的专利附图，使用5种优化的预处理方法：

#### 方法1: 反转 + 二值化 ⚫⚪
- 将白底黑字反转为黑底白字
- OCR对黑底白字的识别效果通常更好
- 使用高阈值(180)进行二值化

#### 方法2: 高对比度 + 双重锐化 🔍
- 对比度增强到3.0x（之前是2.0x）
- 连续两次锐化处理，增强小数字边缘
- 特别适合细线条的专利附图

#### 方法3: 高阈值二值化 ⬛
- 使用阈值200（之前是127）
- 更适合白底黑字的场景
- 去除灰色噪点，保留清晰的黑色数字

#### 方法4: 形态学膨胀 ➕
- 使用MaxFilter加粗细线条
- 让小数字更容易被识别
- 适合线条很细的专利附图

#### 方法5: 原始灰度图 📊
- 作为基准对比
- 某些情况下原始图效果最好

### 3. Tesseract配置优化 ⚙️

**PSM模式**: 从 PSM 6 改为 **PSM 11**
- PSM 6: 假设单列均匀文本
- **PSM 11**: 稀疏文本，适合数字分散在图中的场景
- 专利附图的数字分散分布，PSM 11更合适

```python
custom_config = r'--oem 3 --psm 11 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
```

### 4. 置信度阈值调整 📉

**降低阈值以捕获小数字**:
- OCR初始阈值: 50 → **40**（之前是50）
- 过滤阈值: 60 → **50**（之前是60）
- 小数字的识别置信度通常较低，适当降低阈值可以提高召回率

### 5. 去重阈值调整 📏

- 位置阈值: 20px → **30px**
- 放大后的图像需要更大的去重范围

## 技术原理

### 为什么反转图像？
OCR引擎（特别是Tesseract）对**黑底白字**的识别效果通常优于白底黑字，因为：
1. 训练数据中黑底白字的样本更多
2. 白色文字在黑色背景上边缘更清晰
3. 二值化后的对比度更高

### 为什么放大到3000px？
1. **小数字问题**: 专利附图中的数字通常只有10-20px高
2. **OCR最佳尺寸**: Tesseract在字符高度30-50px时效果最好
3. **放大倍数**: 3000px确保即使原图只有500px，也能放大6倍

### 为什么使用PSM 11？
专利附图的特点：
- 数字分散在图中各个位置
- 没有明确的文本行或列
- 数字之间没有固定的排列顺序

PSM 11专门设计用于这种稀疏文本场景。

## 部署步骤

### 1. 提交代码到Git

```bash
git add backend/routes/drawing_marker.py
git commit -m "优化功能八OCR识别 - 针对专利附图白底黑线小数字优化"
git push origin main
```

### 2. 在服务器上更新代码

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd /home/appuser/patent-app && git pull'"
```

### 3. 重启服务

```bash
ssh root@43.99.101.195 "sudo systemctl restart patent-app"
```

### 4. 验证服务状态

```bash
ssh root@43.99.101.195 "sudo systemctl status patent-app"
```

### 5. 查看日志（可选）

```bash
ssh root@43.99.101.195 "sudo journalctl -u patent-app -f"
```

## 一键部署命令

```bash
git add backend/routes/drawing_marker.py && \
git commit -m "优化功能八OCR识别 - 针对专利附图白底黑线小数字优化" && \
git push origin main && \
ssh root@43.99.101.195 "su - appuser -c 'cd /home/appuser/patent-app && git pull' && sudo systemctl restart patent-app"
```

## 测试验证

### 1. 在前端测试
1. 访问功能八页面
2. 上传专利附图（白底黑线、包含小数字）
3. 输入说明书文本
4. 点击"开始处理"
5. 检查识别结果

### 2. 预期改进
- ✅ 识别数量显著增加（从0个到实际数量）
- ✅ 匹配率提升（从0%到合理水平）
- ✅ 小数字能够被正确识别
- ✅ 置信度在50-90之间（小数字置信度通常不会很高）

### 3. 查看后端日志
```bash
ssh root@43.99.101.195 "sudo journalctl -u patent-app -n 100 | grep DEBUG"
```

应该能看到：
```
[DEBUG] Original size: 800x600
[DEBUG] Upscaled to: (4000, 3000) (scale: 5.00x)
[DEBUG] Running OCR with method: inverted_binary
[DEBUG] OCR detected: '1' (confidence: 75)
[DEBUG] OCR detected: '2' (confidence: 68)
...
[DEBUG] Method inverted_binary detected 15 numbers
```

## 优化效果对比

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 图像尺寸 | 1500-3000px | 固定3000px+ |
| PSM模式 | PSM 6 (单列文本) | PSM 11 (稀疏文本) |
| 预处理方法 | 4种通用方法 | 5种专利附图专用方法 |
| 置信度阈值 | 50/60 | 40/50 |
| 识别率 | 0% | 预期50-80% |

## 如果仍然识别率低

如果优化后识别率仍然很低，可能的原因：

1. **图片质量太差**
   - 分辨率太低（<500px）
   - 图片模糊或失焦
   - 数字太小（<5px）

2. **数字字体特殊**
   - 手写数字
   - 艺术字体
   - 倾斜或变形

3. **背景干扰**
   - 复杂的背景图案
   - 数字与线条重叠
   - 噪点过多

**解决方案**:
- 要求用户提供更高质量的图片
- 考虑使用深度学习OCR引擎（如EasyOCR、PaddleOCR）
- 训练自定义的Tesseract模型

## 相关文件

- `backend/routes/drawing_marker.py` - OCR主逻辑（已优化）
- `backend/utils/ocr_utils.py` - OCR工具函数
- `.kiro/specs/drawing-marker-ocr-fix/tasks.md` - 任务列表

## 下一步

1. **立即部署**: 使用上面的一键部署命令
2. **测试验证**: 用真实的专利附图测试
3. **收集反馈**: 记录识别率和问题
4. **持续优化**: 根据实际效果调整参数
