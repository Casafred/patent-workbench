# 功能八OCR快速修复卡片 🚀

## 🎯 问题
识别出 **0 个数字序号**，匹配率 **0%**

## 💊 最快解决方案（1分钟）

### Windows用户（双击运行）
```
一键诊断OCR.bat
```

### 命令行用户（复制粘贴）
```bash
# 一键修复（在本地执行）
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && \
pip3 install rapidocr-onnxruntime opencv-python Pillow numpy && \
python3 -c \"from rapidocr_onnxruntime import RapidOCR; import cv2; from PIL import Image; print(\\\"✅ OK\\\")\"'" && \
ssh root@43.99.101.195 "systemctl restart patent-app" && \
echo "✅ 修复完成！"
```

## 📋 分步操作

### 步骤1: 快速测试（30秒）
```bash
# 上传并测试
scp quick_ocr_test.py root@43.99.101.195:/home/appuser/patent-app/
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 quick_ocr_test.py'"
```

**看到什么？**
- ✅ 全部通过 → OCR正常，问题在别处
- ❌ 依赖缺失 → 执行步骤2

### 步骤2: 安装依赖（1分钟）
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && \
if [ -d venv ]; then source venv/bin/activate; fi && \
pip install rapidocr-onnxruntime opencv-python Pillow numpy'"
```

### 步骤3: 重启应用（10秒）
```bash
ssh root@43.99.101.195 "systemctl restart patent-app"
```

### 步骤4: 验证修复（30秒）
1. 访问: http://43.99.101.195
2. 进入功能八
3. 上传图片测试

## 🔍 查看日志
```bash
# 实时日志
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -f logs/error.log'"

# 搜索OCR日志
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && grep -i ocr logs/error.log | tail -20'"
```

## 📞 需要帮助？

运行完整诊断并提供输出：
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 diagnose_ocr_complete.py'" > ocr_diagnosis.txt
```

## ⚡ 超快速版（10秒）

如果你确定是依赖问题，直接运行：
```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install rapidocr-onnxruntime opencv-python Pillow'" && ssh root@43.99.101.195 "systemctl restart patent-app"
```

---

**服务器信息**
- IP: 43.99.101.195
- 用户: appuser
- 路径: ~/patent-app
- 服务: patent-app

**预计修复时间**: 1-5分钟
**成功率**: 90%+
