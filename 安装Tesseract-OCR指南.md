# Tesseract OCR 安装指南

## 问题诊断

✅ **已确认问题**：服务器上未安装Tesseract OCR，导致功能八无法识别图片中的数字。

## Windows系统安装步骤

### 1. 下载Tesseract安装包

访问官方下载页面：
https://github.com/UB-Mannheim/tesseract/wiki

推荐下载最新版本（5.x）：
- 64位系统：`tesseract-ocr-w64-setup-5.3.3.20231005.exe`
- 32位系统：`tesseract-ocr-w32-setup-5.3.3.20231005.exe`

### 2. 安装Tesseract

1. 运行下载的安装程序
2. **重要**：安装时选择"添加到系统PATH"选项
3. 默认安装路径：`C:\Program Files\Tesseract-OCR`
4. 确保勾选"Additional language data (download)"以支持多语言

### 3. 验证安装

打开命令提示符（CMD）或PowerShell，运行：

```bash
tesseract --version
```

如果显示版本信息，说明安装成功。

### 4. 手动添加到PATH（如果需要）

如果安装后仍然无法识别`tesseract`命令：

1. 右键"此电脑" → "属性" → "高级系统设置"
2. 点击"环境变量"
3. 在"系统变量"中找到"Path"，点击"编辑"
4. 点击"新建"，添加：`C:\Program Files\Tesseract-OCR`
5. 点击"确定"保存
6. **重启命令提示符**或重启电脑

### 5. 测试OCR功能

运行测试脚本：

```bash
python quick_test_tesseract.py
```

应该显示：
```
✅ Tesseract已安装
tesseract 5.x.x
```

### 6. 重启Flask服务器

安装完成后，必须重启Flask服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
python run_app.py
```

## Linux系统安装步骤

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
sudo apt-get install tesseract-ocr-chi-sim  # 中文支持（可选）
```

### CentOS/RHEL

```bash
sudo yum install tesseract
```

### 验证安装

```bash
tesseract --version
```

## macOS系统安装步骤

使用Homebrew安装：

```bash
brew install tesseract
```

验证安装：

```bash
tesseract --version
```

## 常见问题

### Q1: 安装后仍然提示"Tesseract not found"

**解决方案**：
1. 确认已添加到PATH
2. 重启命令提示符/终端
3. 在代码中手动指定路径（已在代码中添加）

### Q2: OCR识别率低

**解决方案**：
1. 确保图片清晰
2. 图片分辨率不要太低（建议800px以上）
3. 数字要清晰可见，对比度高

### Q3: 识别不到中文

**解决方案**：
安装中文语言包：
```bash
# Windows: 安装时选择语言包
# Linux:
sudo apt-get install tesseract-ocr-chi-sim tesseract-ocr-chi-tra
```

## 代码已更新

我已经在`backend/routes/drawing_marker.py`中添加了：

1. **自动检测Tesseract路径**（Windows系统）
2. **详细的错误日志**，帮助诊断问题
3. **更好的异常处理**

更新内容：
- 自动查找常见的Tesseract安装路径
- 如果找不到，会在日志中显示警告
- OCR失败时会打印详细的错误信息

## 安装后测试流程

1. 安装Tesseract OCR
2. 验证安装：`tesseract --version`
3. 重启Flask服务器
4. 打开功能八
5. 上传专利附图和说明书
6. 查看后端日志，应该看到：
   ```
   [DEBUG] Found Tesseract at: C:\Program Files\Tesseract-OCR\tesseract.exe
   [DEBUG] Running OCR with method: grayscale
   [DEBUG] OCR detected: '1' (confidence: 95)
   [DEBUG] Method grayscale detected 3 numbers
   ```

## 需要帮助？

如果安装后仍有问题，请：
1. 查看Flask服务器的控制台输出
2. 检查是否有`[ERROR]`开头的日志
3. 确认图片中确实包含清晰的数字

## 快速验证命令

```bash
# 1. 检查Tesseract是否安装
tesseract --version

# 2. 测试Python能否调用Tesseract
python quick_test_tesseract.py

# 3. 重启Flask服务器
python run_app.py
```

安装完成后，功能八应该就能正常识别图片中的数字了！
