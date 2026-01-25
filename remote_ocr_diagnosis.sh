#!/bin/bash

# 阿里云OCR功能诊断脚本
# 使用方法：
# 1. 上传此脚本到阿里云服务器
# 2. chmod +x remote_ocr_diagnosis.sh
# 3. ./remote_ocr_diagnosis.sh

echo "=========================================="
echo "功能八OCR识别诊断工具"
echo "=========================================="
echo ""

# 1. 检查Tesseract
echo "1. 检查Tesseract OCR"
echo "-------------------"
if command -v tesseract &> /dev/null; then
    echo "✅ Tesseract已安装"
    tesseract --version
else
    echo "❌ Tesseract未安装"
    echo "安装命令: sudo apt-get install tesseract-ocr"
fi
echo ""

# 2. 检查Python环境
echo "2. 检查Python环境"
echo "-------------------"
python3 --version
echo ""

# 3. 检查Python库
echo "3. 检查Python库"
echo "-------------------"
echo "pytesseract:"
pip3 list 2>/dev/null | grep pytesseract || echo "❌ 未安装"
echo "opencv-python:"
pip3 list 2>/dev/null | grep opencv-python || echo "❌ 未安装"
echo "Pillow:"
pip3 list 2>/dev/null | grep Pillow || echo "❌ 未安装"
echo ""

# 4. 检查Flask进程
echo "4. 检查Flask进程"
echo "-------------------"
FLASK_PID=$(ps aux | grep python | grep -E "flask|run_app|app.py" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$FLASK_PID" ]; then
    echo "✅ Flask进程运行中 (PID: $FLASK_PID)"
    ps aux | grep python | grep -v grep | head -5
else
    echo "⚠️ 未找到Flask进程"
fi
echo ""

# 5. 检查端口
echo "5. 检查端口占用"
echo "-------------------"
netstat -tlnp 2>/dev/null | grep -E ":5000|:8000|:80" || echo "未找到监听端口"
echo ""

# 6. 查找日志文件
echo "6. 查找日志文件"
echo "-------------------"
echo "查找最近修改的日志文件..."
find /home -name "*.log" -mtime -1 2>/dev/null | head -10
find /var/log -name "*flask*" -o -name "*gunicorn*" 2>/dev/null | head -10
echo ""

# 7. 检查应用目录
echo "7. 检查应用目录"
echo "-------------------"
if [ -d "/home/*/patent-workbench" ]; then
    APP_DIR=$(find /home -name "patent-workbench" -type d 2>/dev/null | head -1)
    echo "应用目录: $APP_DIR"
    if [ -n "$APP_DIR" ]; then
        cd "$APP_DIR"
        echo "目录内容:"
        ls -lh *.py *.log 2>/dev/null | head -10
    fi
else
    echo "未找到patent-workbench目录"
fi
echo ""

# 8. 测试Tesseract
echo "8. 测试Tesseract OCR"
echo "-------------------"
if command -v tesseract &> /dev/null; then
    # 创建测试图片
    python3 << 'EOF'
try:
    from PIL import Image, ImageDraw, ImageFont
    import pytesseract
    
    # 创建测试图片
    img = Image.new('RGB', (200, 100), color='white')
    draw = ImageDraw.Draw(img)
    draw.text((50, 30), "123", fill='black')
    img.save('/tmp/test_ocr.png')
    
    # 测试OCR
    result = pytesseract.image_to_string(img)
    print(f"OCR测试结果: '{result.strip()}'")
    
    if '123' in result or '1' in result:
        print("✅ OCR功能正常")
    else:
        print("⚠️ OCR识别结果不准确")
except Exception as e:
    print(f"❌ OCR测试失败: {e}")
EOF
else
    echo "跳过OCR测试（Tesseract未安装）"
fi
echo ""

# 9. 显示最近的错误日志
echo "9. 最近的错误日志"
echo "-------------------"
if [ -f "nohup.out" ]; then
    echo "--- nohup.out 最后30行 ---"
    tail -30 nohup.out | grep -E "ERROR|Exception|Traceback" || echo "无错误"
fi

if [ -f "app.log" ]; then
    echo "--- app.log 最后30行 ---"
    tail -30 app.log | grep -E "ERROR|Exception|Traceback" || echo "无错误"
fi
echo ""

# 10. 总结
echo "=========================================="
echo "诊断完成"
echo "=========================================="
echo ""
echo "请将以上输出发送给开发者进行分析"
echo ""
echo "如需查看实时日志，运行："
echo "  tail -f nohup.out"
echo "  或"
echo "  journalctl -u your-service-name -f"
