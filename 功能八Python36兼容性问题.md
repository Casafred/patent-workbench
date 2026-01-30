# 功能八Python 3.6兼容性问题 🔧

## 🚨 问题发现

```
Could not find a version that satisfies the requirement onnxruntime>=1.7.0
(from versions: 0.1.2, 0.1.3, 0.1.4, 0.2.1, 0.3.0, 0.4.0, 1.0.0, 1.1.0, 1.1.1, 1.1.2, 1.2.0, 1.3.0)
```

**根本原因**: 
- 服务器使用 **Python 3.6**
- Python 3.6最高只支持 **onnxruntime 1.3.0**
- RapidOCR最新版需要 **onnxruntime 1.7.0+**

## 📊 版本兼容性

| Python版本 | onnxruntime最高版本 | RapidOCR支持 |
|-----------|-------------------|-------------|
| 3.6 | 1.3.0 | ❌ 不支持最新版 |
| 3.7 | 1.10.0 | ⚠️ 部分支持 |
| 3.8+ | 最新版 | ✅ 完全支持 |

## 🎯 解决方案（3选1）

### 方案1: 使用兼容Python 3.6的旧版本 ⭐⭐⭐

**优点**: 最快，无需升级Python
**缺点**: 功能可能受限，识别效果可能不如新版

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install rapidocr-onnxruntime==1.3.0 onnxruntime==1.3.0 opencv-python==4.5.5.64 Pillow numpy'"
```

或双击运行: `修复Python36兼容性.bat`

---

### 方案2: 检查是否有更高版本Python ⭐⭐⭐⭐

服务器可能已安装Python 3.8+但未使用

```bash
# 检查可用的Python版本
ssh root@43.99.101.195 "ls -la /usr/bin/python*"

# 检查Python 3.8
ssh root@43.99.101.195 "python3.8 --version"

# 检查Python 3.9
ssh root@43.99.101.195 "python3.9 --version"

# 如果有，使用更高版本安装
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3.8 -m pip install rapidocr-onnxruntime opencv-python Pillow numpy'"
```

---

### 方案3: 升级Python到3.8+ ⭐⭐⭐⭐⭐

**优点**: 最佳长期方案，支持所有新功能
**缺点**: 需要更多时间，可能影响其他应用

#### 步骤1: 安装Python 3.8

```bash
# CentOS/RHEL
ssh root@43.99.101.195 "yum install -y python38 python38-pip python38-devel"

# Ubuntu/Debian
ssh root@43.99.101.195 "apt-get update && apt-get install -y python3.8 python3.8-pip python3.8-dev"
```

#### 步骤2: 创建虚拟环境

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3.8 -m venv venv38'"
```

#### 步骤3: 在新环境中安装依赖

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && source venv38/bin/activate && pip install -r requirements.txt && deactivate'"
```

#### 步骤4: 修改应用启动配置

```bash
# 修改systemd服务文件
ssh root@43.99.101.195 "systemctl edit patent-app"

# 修改ExecStart行为:
# ExecStart=/home/appuser/patent-app/venv38/bin/python /home/appuser/patent-app/app.py
```

#### 步骤5: 重启应用

```bash
ssh root@43.99.101.195 "systemctl daemon-reload && systemctl restart patent-app"
```

---

## 🚀 推荐执行顺序

### 第一步: 快速尝试方案1（5分钟）

```bash
# 安装兼容版本
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install rapidocr-onnxruntime==1.3.0 onnxruntime==1.3.0 opencv-python==4.5.5.64'"

# 重启应用
ssh root@43.99.101.195 "systemctl restart patent-app"

# 测试功能八
```

### 第二步: 如果方案1不行，检查方案2（2分钟）

```bash
# 查看所有Python版本
ssh root@43.99.101.195 "ls -la /usr/bin/python* | grep python3"

# 如果有3.8+，使用它
```

### 第三步: 如果都不行，考虑方案3（30分钟）

升级Python到3.8+

---

## ⚠️ 方案1的限制

使用Python 3.6 + 旧版依赖可能遇到：

1. **识别准确率较低**: 旧版模型效果不如新版
2. **功能受限**: 某些新特性不可用
3. **性能问题**: 优化不如新版

**建议**: 如果方案1能工作，先用着，但计划升级Python

---

## 🔍 诊断当前Python环境

```bash
# 检查Python版本
ssh root@43.99.101.195 "su - appuser -c 'python3 --version'"

# 检查pip版本
ssh root@43.99.101.195 "su - appuser -c 'pip3 --version'"

# 检查已安装的包
ssh root@43.99.101.195 "su - appuser -c 'pip3 list | grep -E \"onnx|opencv|rapid\"'"

# 检查应用使用的Python
ssh root@43.99.101.195 "ps aux | grep python | grep patent"

# 查看systemd服务配置
ssh root@43.99.101.195 "systemctl cat patent-app"
```

---

## 📝 方案1详细步骤

### 1. 卸载已安装的不兼容版本

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 uninstall -y rapidocr-onnxruntime onnxruntime opencv-python'"
```

### 2. 安装兼容版本

```bash
# 使用国内镜像加速
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install -i https://pypi.tuna.tsinghua.edu.cn/simple rapidocr-onnxruntime==1.3.0 onnxruntime==1.3.0 opencv-python==4.5.5.64'"
```

### 3. 验证安装

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 -c \"
import onnxruntime
import cv2
from PIL import Image
print(\\\"✅ onnxruntime:\\\", onnxruntime.__version__)
print(\\\"✅ opencv:\\\", cv2.__version__)
print(\\\"✅ Pillow: OK\\\")
\"'"
```

### 4. 测试RapidOCR导入

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && python3 -c \"
try:
    from rapidocr_onnxruntime import RapidOCR
    print(\\\"✅ RapidOCR导入成功\\\")
except Exception as e:
    print(\\\"❌ RapidOCR导入失败:\\\", e)
\"'"
```

### 5. 重启应用

```bash
ssh root@43.99.101.195 "systemctl restart patent-app"
```

### 6. 查看日志

```bash
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -30 logs/error.log'"
```

---

## 🎯 预期结果

### 成功标志

- ✅ 所有依赖安装成功
- ✅ RapidOCR可以导入
- ✅ 应用启动无错误
- ✅ 功能八识别出 > 0 个数字

### 如果仍然失败

可能需要：
1. 检查是否有虚拟环境冲突
2. 清除Python缓存
3. 考虑升级Python

---

## 💡 长期建议

1. **计划升级Python**: Python 3.6已于2021年12月停止支持
2. **使用虚拟环境**: 避免依赖冲突
3. **定期更新依赖**: 获得最新功能和安全修复

---

## 📞 需要帮助？

提供以下信息：

```bash
# 1. Python版本
ssh root@43.99.101.195 "su - appuser -c 'python3 --version'" > python_version.txt

# 2. 安装日志
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && pip3 install rapidocr-onnxruntime==1.3.0 onnxruntime==1.3.0 opencv-python==4.5.5.64 2>&1'" > install_log.txt

# 3. 应用日志
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && tail -50 logs/error.log'" > app_log.txt
```

---

**最后更新**: 2026-01-29
**问题**: Python 3.6版本过旧
**解决**: 使用兼容版本或升级Python
