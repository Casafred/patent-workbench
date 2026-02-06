# RapidOCR 依赖修复说明

## 问题描述
服务器启动时报错：
```
Failed to import RapidOCR: No module named 'rapidocr_onnxruntime'
```

## 原因分析
- 代码使用了 RapidOCR 进行 OCR 识别
- `requirements.txt` 中缺少 `rapidocr-onnxruntime` 依赖
- 之前配置的是 PaddleOCR，但代码已迁移到 RapidOCR

## 解决方案

### 方法一：使用自动化脚本（推荐）

**Windows:**
```bash
修复RapidOCR依赖.bat
```

**Linux/Mac:**
```bash
chmod +x fix_rapidocr_aliyun.sh
./fix_rapidocr_aliyun.sh
```

### 方法二：手动修复

1. **SSH 连接服务器**
```bash
ssh root@43.99.101.195
```

2. **进入项目目录并激活虚拟环境**
```bash
cd /root/patent_system
source venv/bin/activate
```

3. **安装 RapidOCR**
```bash
pip install rapidocr-onnxruntime>=1.3.0
```

4. **验证安装**
```bash
python -c "from rapidocr_onnxruntime import RapidOCR; print('安装成功!')"
```

5. **重启服务**
```bash
systemctl restart patent_system
```

6. **检查服务状态**
```bash
systemctl status patent_system
```

## 验证修复

访问健康检查接口：
```bash
curl http://43.99.101.195:5001/api/health
```

或在浏览器访问：
```
http://43.99.101.195:5001
```

## 已修改文件

- `requirements.txt` - 将 `paddleocr` 替换为 `rapidocr-onnxruntime`

## RapidOCR vs PaddleOCR

| 特性 | RapidOCR | PaddleOCR |
|------|----------|-----------|
| 内存占用 | ~500MB | ~2GB |
| 速度 | 快 | 较慢 |
| 准确度 | 高 | 高 |
| 依赖大小 | 小 | 大 |
| 适用场景 | 2GB 服务器 | 4GB+ 服务器 |

## 注意事项

1. RapidOCR 使用 ONNX Runtime，比 PaddleOCR 更轻量
2. 适合 2GB 内存的阿里云服务器
3. 专门优化用于专利附图标记识别
4. 支持英文和数字识别

## 相关文档

- `backend/utils/ocr_utils.py` - OCR 工具实现
- `backend/routes/drawing_marker.py` - 附图标注路由
- `功能八OCR修复完成.md` - OCR 功能修复历史
