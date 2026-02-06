# 服务器部署指南 - OCR迁移

## 快速部署（推荐）

### 方法1：使用部署脚本（最简单）

```bash
# 1. SSH登录服务器
ssh root@43.99.101.195

# 2. 切换到应用用户
su - appuser

# 3. 进入应用目录
cd ~/patent-app

# 4. 拉取最新代码（包含部署脚本）
git pull origin main

# 5. 执行部署脚本
chmod +x deploy_ocr_migration.sh
./deploy_ocr_migration.sh
```

### 方法2：一键命令（从本地执行）

你的命令基本正确，但需要一些调整：

```bash
# 原命令（有问题）
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git pull origin main && source venv/bin/activate && pip install -r requirements.txt' && systemctl restart patent-app"

# 修正后的命令（推荐）
ssh root@43.99.101.195 "su - appuser -c 'cd ~/patent-app && git pull origin main && source venv/bin/activate && pip uninstall -y pytesseract && pip install -r requirements.txt' && systemctl restart patent-app"
```

**命令问题分析：**
1. ✓ `su - appuser -c` 正确
2. ✓ `cd ~/patent-app && git pull` 正确
3. ✓ `source venv/bin/activate` 正确
4. ✓ `pip install -r requirements.txt` 正确
5. ⚠️ 只需卸载pytesseract，保留Pillow（用于图像处理）
6. ✓ `systemctl restart patent-app` 正确（需要root权限）

**为什么保留Pillow？**
- Pillow用于可靠的图像格式解码（支持PNG、JPEG、BMP等）
- OpenCV对某些图像格式支持不完善
- 未来可能需要图像标注功能（在图上绘制标记）
- Pillow很轻量（~10MB），不会影响2GB服务器

**改进版命令（更安全）：**

```bash
ssh root@43.99.101.195 << 'ENDSSH'
# 切换到应用用户执行更新
su - appuser << 'ENDSU'
cd ~/patent-app
git pull origin main
source venv/bin/activate
pip uninstall -y pytesseract || true
pip install -r requirements.txt
python3 -c "from rapidocr_onnxruntime import RapidOCR; from PIL import Image; print('✓ RapidOCR和Pillow安装成功')"
ENDSU

# 重启服务（需要root权限）
systemctl restart patent-app
systemctl status patent-app --no-pager | head -n 10
ENDSSH
```

## 详细步骤

### 步骤1：备份当前环境（可选但推荐）

```bash
ssh root@43.99.101.195

# 备份虚拟环境
su - appuser
cd ~/patent-app
cp -r venv venv.backup.$(date +%Y%m%d)

# 备份requirements.txt
cp requirements.txt requirements.txt.backup
```

### 步骤2：更新代码

```bash
su - appuser
cd ~/patent-app
git pull origin main
```

### 步骤3：更新Python依赖

```bash
# 激活虚拟环境
source venv/bin/activate

# 卸载旧依赖（只卸载pytesseract，保留Pillow）
pip uninstall -y pytesseract

# 安装新依赖
pip install -r requirements.txt
```

**注意：** 我们保留Pillow是因为：
- 用于可靠的图像格式解码
- 未来可能需要图像标注功能
- 轻量级（~10MB），不影响服务器性能

### 步骤4：验证安装

```bash
# 测试RapidOCR和Pillow
python3 << 'EOF'
from rapidocr_onnxruntime import RapidOCR
from PIL import Image
import cv2
import numpy as np

print("测试RapidOCR...")
ocr = RapidOCR()
print("✓ RapidOCR初始化成功")

print("测试Pillow...")
test_img = Image.new('RGB', (100, 100), color='white')
print("✓ Pillow工作正常")

# 测试OCR utils
from backend.utils.ocr_utils import initialize_ocr_engine, perform_ocr
print("✓ OCR utils导入成功")
EOF
```

### 步骤5：移除系统级Tesseract（可选）

如果之前安装了系统级的Tesseract，可以移除：

```bash
# 检查是否安装了Tesseract
which tesseract

# 如果安装了，移除（根据系统不同选择命令）

# Ubuntu/Debian
sudo apt-get remove -y tesseract-ocr
sudo apt-get autoremove -y

# CentOS/RHEL
sudo yum remove -y tesseract

# 清理残留文件
sudo rm -rf /usr/share/tesseract-ocr
sudo rm -rf /usr/local/share/tessdata
```

**注意：** 移除系统级Tesseract是可选的，不影响新系统运行。

### 步骤6：重启服务

```bash
# 退出appuser，回到root
exit

# 重启服务
systemctl restart patent-app

# 检查状态
systemctl status patent-app

# 查看日志
journalctl -u patent-app -f
```

## 验证部署

### 1. 检查服务状态

```bash
systemctl status patent-app
```

预期输出：
```
● patent-app.service - Patent Application Service
   Loaded: loaded
   Active: active (running)
```

### 2. 检查日志

```bash
# 查看最近的日志
journalctl -u patent-app -n 50

# 实时查看日志
journalctl -u patent-app -f
```

查找以下关键信息：
- ✓ "RapidOCR engine initialized successfully"
- ✓ 没有 "Tesseract not found" 错误
- ✓ 没有 "pytesseract" 相关错误

### 3. 测试OCR功能

访问应用并测试功能八（附图标记识别）：
1. 上传专利附图
2. 输入说明书文本
3. 点击识别
4. 检查识别结果

### 4. 检查内存使用

```bash
# 查看进程内存
ps aux | grep gunicorn

# 查看系统内存
free -h
```

预期：
- 单个worker进程：300-500MB
- 总内存使用：应在2GB以内

## 故障排除

### 问题1：pip install失败

**症状：** `pip install rapidocr-onnxruntime` 失败

**解决：**
```bash
# 升级pip
pip install --upgrade pip

# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 或阿里云镜像
pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
```

### 问题2：模型下载失败

**症状：** 首次运行时报错 "Failed to download model"

**解决：**
```bash
# 方法1：手动下载模型
mkdir -p ~/.rapidocr
cd ~/.rapidocr
# 从其他机器复制模型文件，或使用代理下载

# 方法2：设置代理
export HTTP_PROXY=http://proxy:port
export HTTPS_PROXY=http://proxy:port
```

### 问题3：服务启动失败

**症状：** `systemctl status patent-app` 显示 failed

**解决：**
```bash
# 查看详细错误
journalctl -u patent-app -n 100

# 检查Python环境
su - appuser
cd ~/patent-app
source venv/bin/activate
python3 -c "from backend.utils.ocr_utils import initialize_ocr_engine; initialize_ocr_engine()"

# 手动启动测试
gunicorn --bind 0.0.0.0:5000 wsgi:app
```

### 问题4：内存不足

**症状：** 服务运行一段时间后崩溃

**解决：**
```bash
# 减少worker数量（编辑systemd服务文件）
sudo nano /etc/systemd/system/patent-app.service

# 修改gunicorn命令，减少workers
# 从: gunicorn --workers 4 ...
# 改为: gunicorn --workers 2 ...

# 重新加载配置
sudo systemctl daemon-reload
sudo systemctl restart patent-app
```

### 问题5：识别率低

**症状：** OCR识别不到标记

**解决：**
1. 检查图片质量
2. 降低置信度阈值（在 `backend/routes/drawing_marker.py` 中）
3. 查看日志中的调试信息

## 回滚方案

如果新系统有问题，可以快速回滚：

```bash
# 1. 回滚代码
cd ~/patent-app
git checkout HEAD~1

# 2. 恢复虚拟环境
rm -rf venv
mv venv.backup.YYYYMMDD venv

# 3. 重启服务
sudo systemctl restart patent-app
```

## 性能监控

### 监控命令

```bash
# CPU和内存使用
top -p $(pgrep -f gunicorn | tr '\n' ',' | sed 's/,$//')

# 实时日志
journalctl -u patent-app -f

# 请求响应时间（如果配置了nginx日志）
tail -f /var/log/nginx/access.log | grep drawing-marker
```

### 性能指标

正常情况下：
- **CPU使用率**: 10-30%（处理请求时）
- **内存使用**: 300-500MB per worker
- **响应时间**: 1-6秒（取决于图片大小）
- **并发能力**: 3-4个请求

## 安全建议

1. **定期备份**
   ```bash
   # 每周备份虚拟环境
   cd ~/patent-app
   tar -czf venv.backup.$(date +%Y%m%d).tar.gz venv
   ```

2. **监控日志**
   ```bash
   # 设置日志轮转
   sudo nano /etc/logrotate.d/patent-app
   ```

3. **更新依赖**
   ```bash
   # 定期更新安全补丁
   pip list --outdated
   pip install --upgrade rapidocr-onnxruntime
   ```

## 联系支持

如遇问题，查看：
- 部署文档：`OCR_MIGRATION_DEPLOYMENT.md`
- 完成总结：`OCR_MIGRATION_COMPLETE.md`
- 测试脚本：`test_rapidocr_migration.py`
