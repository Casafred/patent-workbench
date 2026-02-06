# 部署检查清单

## 部署前检查

- [ ] 已提交所有代码到Git
- [ ] requirements.txt已更新（移除pytesseract/Pillow，添加rapidocr-onnxruntime）
- [ ] 本地测试通过（test_rapidocr_migration.py）
- [ ] 已备份服务器当前环境

## 部署方式选择

### 方式1：使用本地脚本（推荐）

```bash
chmod +x deploy_to_server.sh
./deploy_to_server.sh
```

### 方式2：使用服务器脚本

```bash
ssh root@43.99.101.195
su - appuser
cd ~/patent-app
git pull origin main
chmod +x deploy_ocr_migration.sh
./deploy_ocr_migration.sh
```

### 方式3：手动命令

```bash
ssh root@43.99.101.195 << 'ENDSSH'
su - appuser << 'ENDSU'
cd ~/patent-app
git pull origin main
source venv/bin/activate
pip uninstall -y pytesseract Pillow
pip install -r requirements.txt
python3 -c "from rapidocr_onnxruntime import RapidOCR; RapidOCR(); print('OK')"
ENDSU
systemctl restart patent-app
systemctl status patent-app
ENDSSH
```

## 部署后验证

### 1. 服务状态检查

```bash
ssh root@43.99.101.195 'systemctl status patent-app'
```

预期：`Active: active (running)`

### 2. 日志检查

```bash
ssh root@43.99.101.195 'journalctl -u patent-app -n 50'
```

查找：
- ✓ "RapidOCR engine initialized successfully"
- ✗ 没有 "Tesseract not found"
- ✗ 没有 "pytesseract" 错误

### 3. 功能测试

访问应用测试功能八：
- [ ] 上传专利附图
- [ ] 输入说明书
- [ ] 点击识别
- [ ] 检查识别结果

### 4. 性能检查

```bash
ssh root@43.99.101.195 'free -h && ps aux | grep gunicorn'
```

检查：
- [ ] 内存使用在2GB以内
- [ ] 进程正常运行

## 移除Tesseract（可选）

### 检查是否安装

```bash
ssh root@43.99.101.195 'which tesseract'
```

### 如果安装了，移除

```bash
# Ubuntu/Debian
ssh root@43.99.101.195 'apt-get remove -y tesseract-ocr && apt-get autoremove -y'

# CentOS/RHEL
ssh root@43.99.101.195 'yum remove -y tesseract'

# 清理残留
ssh root@43.99.101.195 'rm -rf /usr/share/tesseract-ocr /usr/local/share/tessdata'
```

**注意：** 这一步是可选的，不影响新系统运行。

## 故障排除

### 如果部署失败

1. **查看详细日志**
   ```bash
   ssh root@43.99.101.195 'journalctl -u patent-app -n 100'
   ```

2. **检查Python环境**
   ```bash
   ssh root@43.99.101.195 'su - appuser -c "cd ~/patent-app && source venv/bin/activate && python3 -c \"import rapidocr_onnxruntime; print(rapidocr_onnxruntime.__version__)\""'
   ```

3. **手动测试**
   ```bash
   ssh root@43.99.101.195
   su - appuser
   cd ~/patent-app
   source venv/bin/activate
   python3 test_rapidocr_migration.py
   ```

### 如果需要回滚

```bash
ssh root@43.99.101.195 << 'ENDSSH'
su - appuser << 'ENDSU'
cd ~/patent-app
git checkout HEAD~1
rm -rf venv
mv venv.backup.* venv
ENDSU
systemctl restart patent-app
ENDSSH
```

## 部署完成确认

- [ ] 服务状态正常
- [ ] 日志无错误
- [ ] OCR功能可用
- [ ] 内存使用正常
- [ ] 响应时间正常（1-6秒）

## 文档参考

- **详细部署指南**: `SERVER_DEPLOYMENT_GUIDE.md`
- **技术文档**: `OCR_MIGRATION_DEPLOYMENT.md`
- **完成总结**: `OCR_MIGRATION_COMPLETE.md`
- **测试脚本**: `test_rapidocr_migration.py`

## 命令快速参考

```bash
# 部署
./deploy_to_server.sh

# 查看状态
ssh root@43.99.101.195 'systemctl status patent-app'

# 查看日志
ssh root@43.99.101.195 'journalctl -u patent-app -f'

# 重启服务
ssh root@43.99.101.195 'systemctl restart patent-app'

# 检查内存
ssh root@43.99.101.195 'free -h'
```
