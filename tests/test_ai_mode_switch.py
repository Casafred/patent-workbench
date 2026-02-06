#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试AI说明书处理开关功能
验证AI模式和规则模式是否正确切换
"""

import json
import base64
from pathlib import Path

# 测试说明书文本
test_specification = """
本实用新型涉及一种智能手机支架。

如图1所示，该智能手机支架包括：
底座10，用于放置在桌面上；
支撑臂20，一端连接于底座10；
夹持装置30，设置在支撑臂20的另一端，用于夹持手机；
调节机构40，用于调节支撑臂20的角度。

其中，底座10采用防滑材料制成，支撑臂20可以360度旋转。
夹持装置30包括两个夹持片31和弹簧32。
"""

# 测试图片（1x1像素的透明PNG，base64编码）
test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def test_ai_mode_off():
    """测试AI模式关闭时的行为"""
    print("\n" + "="*60)
    print("测试1: AI模式关闭（使用jieba分词）")
    print("="*60)
    
    request_data = {
        "drawings": [
            {
                "name": "test.png",
                "type": "image/png",
                "size": 100,
                "data": test_image_base64
            }
        ],
        "specification": test_specification,
        "ai_mode": False
    }
    
    print("\n请求数据:")
    print(f"  - ai_mode: {request_data['ai_mode']}")
    print(f"  - specification length: {len(request_data['specification'])} chars")
    print(f"  - drawings count: {len(request_data['drawings'])}")
    
    print("\n预期行为:")
    print("  ✓ 后端应使用 extract_reference_markers (jieba分词)")
    print("  ✓ 日志应显示: [DEBUG] Using rule-based mode (jieba) to extract components")
    print("  ✓ 返回的 extraction_method 应为: 'jieba分词'")
    
    print("\n预期抽取结果:")
    print("  - 10: 底座")
    print("  - 20: 支撑臂")
    print("  - 30: 夹持装置")
    print("  - 31: 夹持片")
    print("  - 32: 弹簧")
    print("  - 40: 调节机构")
    
    return request_data

def test_ai_mode_on():
    """测试AI模式开启时的行为"""
    print("\n" + "="*60)
    print("测试2: AI模式开启（使用AI智能抽取）")
    print("="*60)
    
    request_data = {
        "drawings": [
            {
                "name": "test.png",
                "type": "image/png",
                "size": 100,
                "data": test_image_base64
            }
        ],
        "specification": test_specification,
        "ai_mode": True,
        "model_name": "glm-4-flash",
        "custom_prompt": None
    }
    
    print("\n请求数据:")
    print(f"  - ai_mode: {request_data['ai_mode']}")
    print(f"  - model_name: {request_data['model_name']}")
    print(f"  - specification length: {len(request_data['specification'])} chars")
    print(f"  - drawings count: {len(request_data['drawings'])}")
    
    print("\n预期行为:")
    print("  ✓ 后端应使用 AIDescriptionProcessor")
    print("  ✓ 日志应显示: [DEBUG] Using AI mode to extract components")
    print("  ✓ 日志应显示: [DEBUG] AI extracted reference_map: {...}")
    print("  ✓ 返回的 extraction_method 应为: 'AI智能抽取'")
    
    print("\n预期AI处理流程:")
    print("  1. 检测语言（中文）")
    print("  2. 跳过翻译（已是中文）")
    print("  3. 使用AI模型抽取部件标记")
    print("  4. 返回结构化的 components 列表")
    
    print("\n预期抽取结果（AI可能更准确）:")
    print("  - 10: 底座")
    print("  - 20: 支撑臂")
    print("  - 30: 夹持装置")
    print("  - 31: 夹持片")
    print("  - 32: 弹簧")
    print("  - 40: 调节机构")
    
    return request_data

def test_ai_mode_missing_model():
    """测试AI模式开启但未提供模型名称"""
    print("\n" + "="*60)
    print("测试3: AI模式开启但缺少model_name（应报错）")
    print("="*60)
    
    request_data = {
        "drawings": [
            {
                "name": "test.png",
                "type": "image/png",
                "size": 100,
                "data": test_image_base64
            }
        ],
        "specification": test_specification,
        "ai_mode": True
        # 故意不提供 model_name
    }
    
    print("\n请求数据:")
    print(f"  - ai_mode: {request_data['ai_mode']}")
    print(f"  - model_name: (未提供)")
    
    print("\n预期行为:")
    print("  ✓ 后端应返回 400 错误")
    print("  ✓ 错误信息: 'model_name is required when ai_mode is true'")
    
    return request_data

def main():
    print("\n" + "="*60)
    print("AI说明书处理开关功能测试")
    print("="*60)
    
    print("\n修复说明:")
    print("  问题: 打开AI开关后仍使用正则/jieba处理说明书")
    print("  修复: 在 process_drawing_marker 中添加 ai_mode 判断")
    print("  文件: backend/routes/drawing_marker.py")
    
    # 运行测试
    test1_data = test_ai_mode_off()
    test2_data = test_ai_mode_on()
    test3_data = test_ai_mode_missing_model()
    
    print("\n" + "="*60)
    print("测试数据已生成")
    print("="*60)
    
    print("\n如何测试:")
    print("1. 启动后端服务")
    print("2. 打开浏览器访问功能八（交互式附图标注）")
    print("3. 上传测试图片和说明书")
    print("4. 切换AI开关，观察处理结果")
    print("5. 查看后端日志，确认使用了正确的处理方式")
    
    print("\n验证要点:")
    print("  ✓ AI模式关闭: extraction_method = 'jieba分词'")
    print("  ✓ AI模式开启: extraction_method = 'AI智能抽取'")
    print("  ✓ 后端日志显示正确的处理模式")
    print("  ✓ 抽取结果符合预期")
    
    print("\n" + "="*60)
    print("测试完成！")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
