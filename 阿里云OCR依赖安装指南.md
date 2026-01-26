# 阿里云OCR依赖安装指南

## 问题诊断结果

根据远程诊断输出，阿里云服务器上：
- ✅ **Tesseract OCR 4.1.1 已安装**
- ❌ **缺少Python库**：pytesseract、opencv-python、Pillow

这就是为什么OCR识别返回0结果的原因！

## 应用信息
- **应用目录**：`/home/appuser/patent-app`
- **部署方式**：nginx + gunicorn/uwsgi
- **Python版本**：需要确认（通常是Python 3.7+）

## 安装步骤

### 第一步：SSH连接到服务器

```bash
ssh appuser@你的服务器IP
# 或使用阿里云控制台的"远程连接"功能
```

### 第二步：进入应用目录

```bash
cd /home/appuser/patent-app
```

### 第三步：检查Python环境

```bash
# 检查Python版本
python3 --version

# 检查pip版本
pip3 --version

# 如果pip未安装，先安装pip
sudo apt-get update
sudo apt-get install python3-pip
```

### 第四步：安装缺失的Python库

```bash
# 安装所有OCR相关依赖
pip3 install pytesseract==0.3.10 opencv-python==4.8.1.78 Pillow==10.1.0

# 或者使用requirements.txt（如果存在）
pip3 install -r requirements.txt
```

**注意**：如果遇到权限问题，使用`--user`参数：
```bash
pip3 install --user pytesseract==0.3.10 opencv-python==4.8.1.78 Pillow==10.1.0
```

### 第五步：验证安装

```bash
# 验证所有库都已安装
python3 -c "import pytesseract; import cv2; from PIL import Image; print('✅ 所有库安装成功')"
```

如果看到"✅ 所有库安装成功"，说明安装成功！

### 第六步：找到并重启应用服务

#### 方法1：如果使用systemd服务

```bash
# 查找服务名称
sudo systemctl list-units | grep -E "patent|flask|gunicorn"

# 重启服务（替换your-service-name为实际服务名）
sudo systemctl restart your-service-name

# 查看服务状态
sudo systemctl status your-service-name
```

#### 方法2：如果使用gunicorn

```bash
# 查找gunicorn进程
ps aux | grep gunicorn

# 杀死旧进程（替换PID为实际进程ID）
sudo kill -HUP <PID>

# 或者重启gunicorn
sudo pkill -HUP gunicorn
```

#### 方法3：如果使用uwsgi

```bash
# 查找uwsgi进程
ps aux | grep uwsgi

# 重启uwsgi
sudo systemctl restart uwsgi
# 或
sudo service uwsgi restart
```

#### 方法4：如果使用supervisor

```bash
# 查看所有进程
sudo supervisorctl status

# 重启应用
sudo supervisorctl restart patent-app
```

### 第七步：查看日志确认启动成功

```bash
# 查看应用日志
tail -f /home/appuser/patent-app/logs/error.log

# 或查看系统日志
sudo journalctl -u your-service-name -f

# 或查看gunicorn日志
tail -f /var/log/gunicorn/error.log
```

### 第八步：测试功能八

1. 打开网站：`http://你的服务器IP`
2. 进入功能八（专利附图标记识别）
3. 上传一张专利附图
4. 输入说明书内容
5. 点击"开始处理"
6. 查看识别结果是否正常

同时在SSH终端查看日志输出，应该能看到：
```
[DEBUG] Extracted reference_map: {'1': '底座', '2': '旋转臂'}
[DEBUG] Processing drawing: test.png
[DEBUG] Image size: (800, 600)
[DEBUG] Running OCR with method: grayscale
[DEBUG] OCR detected: '1' (confidence: 95)
[DEBUG] Total unique detections after deduplication: 2
```

## 常见问题排查

### 问题1：pip install失败

**错误**：`error: externally-managed-environment`

**解决**：使用虚拟环境或`--break-system-packages`
```bash
pip3 install --break-system-packages pytesseract opencv-python Pillow
```

### 问题2：opencv-python安装失败

**错误**：缺少系统依赖

**解决**：安装系统依赖
```bash
sudo apt-get update
sudo apt-get install -y libgl1-mesa-glx libglib2.0-0
pip3 install opencv-python
```

### 问题3：找不到应用服务

**解决**：手动查找进程
```bash
# 查找所有Python进程
ps aux | grep python

# 查找监听5000端口的进程
sudo netstat -tlnp | grep :5000

# 查找应用目录下的进程
ps aux | grep /home/appuser/patent-app
```

### 问题4：重启后还是不工作

**可能原因**：
1. 虚拟环境问题 - 库安装在系统Python，但应用使用虚拟环境
2. 权限问题 - 应用用户无法访问安装的库
3. 缓存问题 - 需要清除Python缓存

**解决**：
```bash
# 检查是否使用虚拟环境
ls -la /home/appuser/patent-app/venv

# 如果有虚拟环境，在虚拟环境中安装
source /home/appuser/patent-app/venv/bin/activate
pip install pytesseract opencv-python Pillow
deactivate

# 清除Python缓存
find /home/appuser/patent-app -type d -name __pycache__ -exec rm -rf {} +
```

## 快速诊断脚本

创建一个脚本来快速检查所有依赖：

```bash
# 创建诊断脚本
cat > check_ocr_deps.sh << 'EOF'
#!/bin/bash

echo "=== 检查Tesseract ==="
tesseract --version

echo ""
echo "=== 检查Python版本 ==="
python3 --version

echo ""
echo "=== 检查Python库 ==="
python3 -c "
try:
    import pytesseract
    print('✅ pytesseract:', pytesseract.__version__)
except ImportError:
    print('❌ pytesseract: NOT INSTALLED')

try:
    import cv2
    print('✅ opencv-python:', cv2.__version__)
except ImportError:
    print('❌ opencv-python: NOT INSTALLED')

try:
    from PIL import Image
    import PIL
    print('✅ Pillow:', PIL.__version__)
except ImportError:
    print('❌ Pillow: NOT INSTALLED')
"

echo ""
echo "=== 检查应用进程 ==="
ps aux | grep -E "python|gunicorn|uwsgi" | grep -v grep

echo ""
echo "=== 检查端口占用 ==="
sudo netstat -tlnp | grep -E ":80|:5000|:8000"
EOF

# 运行诊断
chmod +x check_ocr_deps.sh
./check_ocr_deps.sh
```

## 验证清单

安装完成后，请确认：

- [ ] Tesseract已安装：`tesseract --version`
- [ ] pytesseract已安装：`python3 -c "import pytesseract; print(pytesseract.__version__)"`
- [ ] opencv-python已安装：`python3 -c "import cv2; print(cv2.__version__)"`
- [ ] Pillow已安装：`python3 -c "from PIL import Image; import PIL; print(PIL.__version__)"`
- [ ] 应用服务已重启
- [ ] 日志显示正常启动
- [ ] 功能八能够识别出数字序号（不再是0个）
- [ ] 前端显示真实的识别结果

## 预期结果

安装完成并重启后，功能八应该能够：
1. ✅ 正确识别专利附图中的数字序号
2. ✅ 显示真实的识别数量（不再是0）
3. ✅ 显示准确的匹配率
4. ✅ 在Canvas上标注识别位置
5. ✅ 提供改进建议

## 需要帮助？

如果遇到问题，请提供以下信息：

1. **诊断脚本输出**：
   ```bash
   ./check_ocr_deps.sh
   ```

2. **安装日志**：
   ```bash
   pip3 install pytesseract opencv-python Pillow 2>&1 | tee install.log
   ```

3. **应用日志**（测试功能八时）：
   ```bash
   tail -100 /home/appuser/patent-app/logs/error.log
   ```

4. **进程信息**：
   ```bash
   ps aux | grep python
   ```

把这些信息发给我，我会帮你进一步诊断！
