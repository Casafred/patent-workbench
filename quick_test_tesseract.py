"""快速测试Tesseract是否安装"""
import subprocess
import sys

try:
    result = subprocess.run(['tesseract', '--version'], 
                          capture_output=True, 
                          text=True, 
                          timeout=5)
    print("✅ Tesseract已安装")
    print(result.stdout)
except FileNotFoundError:
    print("❌ Tesseract未安装或未添加到PATH")
    print("\n请安装Tesseract OCR:")
    print("Windows: https://github.com/UB-Mannheim/tesseract/wiki")
    print("下载安装后，确保添加到系统PATH")
    sys.exit(1)
except Exception as e:
    print(f"❌ 错误: {str(e)}")
    sys.exit(1)
