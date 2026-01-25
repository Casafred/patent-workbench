#!/usr/bin/env python3
"""
测试附图标记识别功能的脚本

使用说明：
1. 确保后端服务已启动（运行 python backend/app.py）
2. 运行本脚本：python test_drawing_marker.py
3. 查看输出结果
"""

import requests
import base64
import os

# 后端API地址
API_URL = "http://127.0.0.1:5001/api/drawing-marker/process"

# 测试用的图片文件
# 图片位于tests文件夹中
TEST_IMAGE_PATH = "tests/test patent pic.png"  # 测试图片路径

# 测试用的说明书内容
TEST_SPECIFICATION = "1电动工具、2外壳、2L左侧外壳、2R右侧外壳、3后盖、3S螺钉"

def test_drawing_marker():
    """测试附图标记识别功能"""
    print("=" * 80)
    print("测试附图标记识别功能")
    print("=" * 80)
    
    # 检查测试图片是否存在
    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"❌ 测试图片不存在: {TEST_IMAGE_PATH}")
        print("请将测试图片放在当前目录下，或者修改脚本中的 TEST_IMAGE_PATH 变量")
        return
    
    # 读取并编码测试图片
    with open(TEST_IMAGE_PATH, "rb") as f:
        image_data = f.read()
        base64_image = base64.b64encode(image_data).decode("utf-8")
    
    print(f"✅ 已读取测试图片: {TEST_IMAGE_PATH}")
    print(f"✅ 图片大小: {len(image_data)} 字节")
    print(f"✅ 说明书内容: {TEST_SPECIFICATION}")
    print()
    
    # 构建请求数据
    request_data = {
        "drawings": [
            {
                "name": os.path.basename(TEST_IMAGE_PATH),
                "type": "image/png",
                "size": len(image_data),
                "data": base64_image
            }
        ],
        "specification": TEST_SPECIFICATION
    }
    
    # 发送请求
    print("📤 发送请求到后端 API...")
    try:
        response = requests.post(API_URL, json=request_data, timeout=30)
        response.raise_for_status()  # 抛出 HTTP 错误
    except requests.exceptions.RequestException as e:
        print(f"❌ 请求失败: {e}")
        return
    
    # 解析响应
    result = response.json()
    print(f"✅ 请求成功，状态码: {response.status_code}")
    print()
    
    # 显示结果
    print("📋 处理结果")
    print("-" * 80)
    print(f"{result['data']['message']}")
    print()
    
    # 显示详细结果
    print("🔍 详细结果")
    print("-" * 80)
    print(f"从说明书中提取到 {len(result['data']['reference_map'])} 个附图标记")
    print("附图标记映射:")
    for number, name in result['data']['reference_map'].items():
        print(f"  {number}: {name}")
    print()
    
    # 显示每张图片的识别结果
    for drawing in result['data']['drawings']:
        print(f"图片: {drawing['name']}")
        print(f"  识别到 {len(drawing['detected_numbers'])} 个数字序号")
        
        if drawing['detected_numbers']:
            print("  识别结果:")
            for detected in drawing['detected_numbers']:
                status = "✅" if not detected.get('unmatched', False) else "⚠️"
                print(f"    {status} {detected['number']}: {detected['name']} (置信度: {detected['confidence']}%)")
        else:
            print("  ⚠️  未识别到任何数字序号")
    
    print()
    
    # 显示调试信息（如果有）
    if 'debug_info' in result['data']:
        debug = result['data']['debug_info']
        print("🐛 调试信息")
        print("-" * 80)
        
        # Tesseract 状态
        print(f"Tesseract 可用: {'✅' if debug['tesseract_available'] else '❌'}")
        if debug['tesseract_available']:
            print(f"Tesseract 版本: {debug['tesseract_version']}")
        else:
            print(f"Tesseract 错误: {debug.get('tesseract_error', '未知错误')}")
        
        # 图像处理信息
        for image_info in debug['image_processing']:
            print(f"\n图片: {image_info['name']}")
            print(f"  尺寸: {image_info['width']} x {image_info['height']}")
            print(f"  识别到 {image_info['detected_count']} 个数字/标记")
            
            # 显示预处理方法的结果
            print("  预处理方法结果:")
            for preprocess_result in image_info['preprocessing_results']:
                # 只显示有检测结果的预处理方法
                if preprocess_result['detected_count'] > 0:
                    config = preprocess_result['config'].split()[2]  # 只显示 PSM 设置
                    print(f"    {preprocess_result['method']} ({config}): {preprocess_result['detected_count']} 个检测结果")
    
    print()
    print("=" * 80)
    print("测试完成")
    print("=" * 80)

if __name__ == "__main__":
    test_drawing_marker()
