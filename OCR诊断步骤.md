# OCR识别问题诊断步骤

## 当前状态

- ✅ Tesseract OCR 4.1.1 已安装
- ✅ Python依赖已安装 (pytesseract, Pillow)
- ✅ API调用成功，说明书解析正常
- ❌ **OCR识别率为0** - 核心问题

## 诊断步骤

### 步骤1: 上传诊断脚本到服务器

```bash
scp test_ocr_on_server.py root@43.99.101.195:/home/appuser/patent-app/
```

### 步骤2: 上传测试图片到服务器

从本地上传你在前端测试时使用的图片:

```bash
scp "tests/test patent pic.png" root@43.99.101.195:/home/appuser/patent-app/test_image.png
```

或者如果图片在其他位置:

```bash
scp "你的图片路径.png" root@43.99.101.195:/home/appuser/patent-app/test_image.png
```

### 步骤3: 在服务器上运行诊断脚本

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd /home/appuser/patent-app && python3 test_ocr_on_server.py test_image.png'"
```

## 诊断脚本功能

该脚本会测试:

1. **6种不同的Tesseract配置**:
   - 默认配置
   - PSM 6 + 数字字母白名单
   - PSM 11 + 数字字母白名单
   - PSM 6 + 仅数字白名单
   - PSM 11 + 仅数字白名单
   - PSM 3 + 数字字母白名单

2. **多种图像预处理方法**:
   - 原始灰度图
   - 对比度增强 (1.5x, 2.0x, 2.5x)
   - 锐化
   - 二值化 (阈值: 100, 127, 150, 180)
   - 图像放大 (1.5x, 2.0x)
   - 组合优化 (放大 + 对比度 + 锐化)

3. **输出信息**:
   - 每种组合的识别数量
   - 识别到的具体数字
   - 最佳配置和预处理方法
   - 详细的识别结果（文本、置信度、位置）

## 预期结果

### 如果识别成功

脚本会显示:
```
✅ 对比度增强 x2.0        | 识别: 15 | 数字: 1, 2, 3, 4, 5 ... (+10)
```

然后我们可以:
1. 找到最佳的配置和预处理方法
2. 更新 `backend/routes/drawing_marker.py` 使用最佳配置
3. 重启服务并测试

### 如果识别失败

脚本会显示:
```
❌ 未识别到任何数字
```

可能的原因:
1. 图片中的数字太小或太模糊
2. 图片质量不足
3. 数字的字体或样式不适合OCR
4. 需要更高级的预处理方法

## 下一步行动

根据诊断结果:

### 场景A: 找到有效配置
1. 记录最佳的配置参数和预处理方法
2. 更新 `backend/routes/drawing_marker.py` 中的OCR配置
3. 可能需要调整预处理流程
4. 推送更新到Git
5. 在服务器上拉取更新: `cd /home/appuser/patent-app && git pull`
6. 重启服务: `sudo systemctl restart patent-app`
7. 重新测试

### 场景B: 所有配置都失败
1. 检查测试图片是否真的包含清晰的数字
2. 可能需要用户提供更高质量的图片
3. 考虑使用更高级的OCR引擎或预处理算法
4. 可能需要训练自定义的Tesseract模型

## 快速命令参考

```bash
# 一键上传并运行诊断
scp test_ocr_on_server.py root@43.99.101.195:/home/appuser/patent-app/ && \
scp "tests/test patent pic.png" root@43.99.101.195:/home/appuser/patent-app/test_image.png && \
ssh root@43.99.101.195 "su - appuser -c 'cd /home/appuser/patent-app && python3 test_ocr_on_server.py test_image.png'"
```

## 注意事项

1. 确保测试图片路径正确
2. 如果图片文件名包含空格，记得用引号括起来
3. 诊断脚本会测试多种组合，可能需要1-2分钟运行时间
4. 保存诊断输出，以便分析最佳配置
