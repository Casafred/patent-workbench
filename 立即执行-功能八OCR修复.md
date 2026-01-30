# 立即执行 - 功能八OCR修复

## 🚨 当前状态
- ❌ 识别出 0 个数字序号
- ❌ 匹配率 0%
- ❌ 平均置信度 0%

## ✅ 执行方案（选择一个）

---

### 方案A: Windows一键修复（最简单）⭐

**步骤**:
1. 双击运行 `一键诊断OCR.bat`
2. 按提示操作
3. 完成！

**时间**: 2-3分钟

---

### 方案B: 命令行一键修复（最快）⭐⭐

**复制粘贴以下命令**:

```bash
# 1. 上传脚本
scp quick_ocr_test.py fix_ocr_aliyun.sh diagnose_ocr_complete.py root@43.99.101.195:/home/appuser/patent-app/

# 2. 快速测试
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 quick_ocr_test.py'"

# 3. 如果测试失败，运行修复
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && chmod +x fix_ocr_aliyun.sh && ./fix_ocr_aliyun.sh'"

# 4. 重启应用
ssh root@43.99.101.195 "systemctl restart patent-app"

# 5. 查看日志
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -20 logs/error.log'"
```

**时间**: 3-5分钟

---

### 方案C: 超快速修复（如果确定是依赖问题）⭐⭐⭐

**一条命令搞定**:

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && if [ -d venv ]; then source venv/bin/activate; fi && pip install rapidocr-onnxruntime opencv-python Pillow numpy && python -c \"from rapidocr_onnxruntime import RapidOCR; import cv2; from PIL import Image; print(\\\"✅ 依赖已安装\\\")\"'" && ssh root@43.99.101.195 "systemctl restart patent-app && echo '✅ 应用已重启'"
```

**时间**: 1-2分钟

---

## 📊 验证修复

### 1. 查看日志
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -f logs/error.log'"
```

**期望看到**:
```
[DEBUG] Extracted reference_map: {'1': '底座', '2': '旋转臂'}
[DEBUG] OCR detected 5 markers
[DEBUG] After filtering: 3 detections remain
```

### 2. 测试功能八

1. 访问: **http://43.99.101.195**
2. 进入 **功能八（专利附图标记识别）**
3. 上传测试图片（使用 `test_ocr_diagnostic.png`）
4. 输入说明书:
   ```
   1. 底座
   2. 旋转臂
   3. 夹紧装置
   4. 控制器
   5. 传感器
   ```
5. 点击"开始处理"

**期望结果**:
- ✅ 识别出 > 0 个数字序号
- ✅ 匹配率 > 0%
- ✅ 平均置信度 > 0%
- ✅ Canvas上显示标注

---

## 🔧 如果还是不行

### 运行完整诊断
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 diagnose_ocr_complete.py'" > diagnosis.txt
```

把 `diagnosis.txt` 的内容发给我，我会进一步分析。

### 检查虚拟环境
```bash
# 查看是否有虚拟环境
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && ls -la | grep venv'"

# 如果有venv，在虚拟环境中安装
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv/bin/activate && pip install rapidocr-onnxruntime opencv-python Pillow && deactivate'"
```

### 检查应用进程
```bash
# 查看Python进程
ssh root@43.99.101.195 "ps aux | grep python | grep -v grep"

# 查看应用状态
ssh root@43.99.101.195 "systemctl status patent-app"
```

---

## 📝 常见问题

### Q: 命令执行失败？
**A**: 检查SSH密钥配置，或手动SSH连接后执行命令

### Q: 依赖安装失败？
**A**: 可能是网络问题，尝试：
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip install -i https://pypi.tuna.tsinghua.edu.cn/simple rapidocr-onnxruntime opencv-python Pillow'"
```

### Q: 重启后还是0结果？
**A**: 可能是虚拟环境问题，确保依赖安装在正确的Python环境

---

## 🎯 预期结果

修复后，功能八应该能够：
- ✅ 识别专利附图中的数字标记
- ✅ 显示真实的识别数量（不再是0）
- ✅ 计算准确的匹配率
- ✅ 在Canvas上标注识别位置
- ✅ 提供改进建议

---

## 📞 需要帮助？

提供以下信息：
1. 快速测试输出: `quick_ocr_test.py`
2. 完整诊断输出: `diagnose_ocr_complete.py`
3. 应用日志: `tail -50 logs/error.log`
4. 进程信息: `ps aux | grep python`

---

**最后更新**: 2026-01-29
**预计修复时间**: 1-5分钟
**成功率**: 90%+
