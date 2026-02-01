#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试功能八部件提取算法的准确性
"""

import sys
import os

# 添加backend目录到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from utils.component_extractor import extract_reference_markers


# 测试用例
test_cases = [
    {
        "name": "测试1: 标准格式",
        "text": """
        机壳71包括机身部分711、手柄部分712、和底座部分713。
        其中，71. 机壳
        711. 机身部分
        712. 手柄部分
        713. 底座部分
        """,
        "expected": {
            "71": "机壳",
            "711": "机身部分",
            "712": "手柄部分",
            "713": "底座部分"
        }
    },
    {
        "name": "测试2: 部件名称在数字前（真实案例）",
        "text": """
        扳机开关202设置在手柄712内靠近机身711的位置处，其包括位于手柄712内的电位器(potentiometer)2022以及与电位器可作动的连接并延伸出手柄712外的扳机2021。
        电位器2022通过电性导线(未图示)与电机72和第二电路板76(将在后文中详细描述)电性连接。
        扣合按钮104设置在电池包10上，其具有按钮部1042和扣合部1041。
        """,
        "expected": {
            "202": "扳机开关",
            "712": "手柄",
            "711": "机身",
            "2022": "电位器",
            "2021": "扳机",
            "72": "电机",
            "76": "第二电路板",
            "104": "扣合按钮",
            "10": "电池包",
            "1042": "按钮部",
            "1041": "扣合部"
        }
    },
    {
        "name": "测试3: 避免误提取描述性文字",
        "text": """
        底座部分713基本上垂直于手柄部分712设置。需要说明的是，此处以及后文中提到的"基本上垂直"是指手柄部分712的延伸轴线B和底座部分713的延伸轴线C基本上垂直设置，包括两轴线绝对地垂直，也包括两轴线的夹角比直角略大或略小一角度，如20度以内的任何角度。
        """,
        "expected": {
            "713": "底座部分",
            "712": "手柄部分"
        }
    },
    {
        "name": "测试4: 复杂句子中的部件",
        "text": """
        第二电路板76设置在底座713内，其与底座713的延伸方向(图6中的C轴所示)基本平行，而与手柄712的延伸方向(图6中的B轴所示)大致垂直。
        上述实施方式中提到的电机控制单元22、电机电流检测元件28、直流电源转换模块24、以及电机控制开关201等电子控制组件均设置在第二电路板76的上表面。
        """,
        "expected": {
            "76": "第二电路板",
            "713": "底座",
            "712": "手柄",
            "22": "电机控制单元",
            "28": "电机电流检测元件",
            "24": "直流电源转换模块",
            "201": "电机控制开关"
        }
    },
    {
        "name": "测试5: 带字母的编号",
        "text": """
        第二端子组件77设置在第二电路板76的下表面，其包括一端子本体771以及设置在端子本体771内的若干第二导电端子，即第二正极端子(B+)25、第二负极端子(B-)29、第二电源端子(Vcc)26、以及第二状态指示端子(BH)27。
        """,
        "expected": {
            "77": "第二端子组件",
            "76": "第二电路板",
            "771": "端子本体",
            "25": "第二正极端子",
            "29": "第二负极端子",
            "26": "第二电源端子",
            "27": "第二状态指示端子"
        }
    }
]


def run_tests():
    """运行所有测试用例"""
    print("=" * 80)
    print("功能八部件提取算法测试")
    print("=" * 80)
    
    total_tests = len(test_cases)
    passed_tests = 0
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{test_case['name']}")
        print("-" * 80)
        
        result = extract_reference_markers(test_case['text'])
        expected = test_case['expected']
        
        # 检查结果
        all_correct = True
        missing_keys = []
        extra_keys = []
        wrong_values = []
        
        # 检查缺失的键
        for key in expected:
            if key not in result:
                missing_keys.append(key)
                all_correct = False
        
        # 检查多余的键
        for key in result:
            if key not in expected:
                extra_keys.append(key)
                all_correct = False
        
        # 检查值是否正确
        for key in expected:
            if key in result and result[key] != expected[key]:
                wrong_values.append((key, expected[key], result[key]))
                all_correct = False
        
        # 输出结果
        if all_correct:
            print(f"✓ 测试通过")
            passed_tests += 1
        else:
            print(f"✗ 测试失败")
            
            if missing_keys:
                print(f"  缺失的部件: {missing_keys}")
                for key in missing_keys:
                    print(f"    {key}: {expected[key]} (未提取)")
            
            if extra_keys:
                print(f"  多余的部件: {extra_keys}")
                for key in extra_keys:
                    print(f"    {key}: {result[key]} (不应提取)")
            
            if wrong_values:
                print(f"  错误的值:")
                for key, exp_val, act_val in wrong_values:
                    print(f"    {key}: 期望='{exp_val}', 实际='{act_val}'")
        
        print(f"\n提取结果 ({len(result)} 个部件):")
        for key in sorted(result.keys(), key=lambda x: (len(x), x)):
            print(f"  {key}: {result[key]}")
    
    # 总结
    print("\n" + "=" * 80)
    print(f"测试总结: {passed_tests}/{total_tests} 通过")
    print("=" * 80)
    
    return passed_tests == total_tests


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)
