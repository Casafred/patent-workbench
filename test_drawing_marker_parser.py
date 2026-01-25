"""
测试附图标记解析功能
"""
import re

def extract_reference_markers(spec_text):
    """
    提取附图标记，支持多种格式：
    - "1. 底座" 或 "1、底座"
    - "1电动工具" (数字直接连接文字)
    - "1 电动工具" (数字和文字之间有空格)
    - "1…电动工具" (数字和文字之间有省略号)
    """
    reference_map = {}
    
    # 模式1: 数字 + 分隔符(. 、 …) + 名称
    pattern1 = r'([0-9]+[A-Z]*)\s*[.、…]\s*([^。；，,;\n、…]+)'
    matches1 = re.findall(pattern1, spec_text)
    for match in matches1:
        number = match[0]
        name = match[1].strip()
        if name:  # 确保名称不为空
            reference_map[number] = name
    
    # 模式2: 数字(可能带字母) + 中文字符，用顿号分隔 (如 "1电动工具、2外壳、")
    # 先按顿号分割
    parts = spec_text.split('、')
    for part in parts:
        part = part.strip()
        # 匹配 "数字+字母(可选)+中文" 的模式
        match = re.match(r'^([0-9]+[A-Z]*)(.+)$', part)
        if match:
            number = match.group(1)
            name = match.group(2).strip()
            # 移除开头的省略号、空格等分隔符
            name = re.sub(r'^[…\s.、]+', '', name)
            if name and number not in reference_map:
                reference_map[number] = name
    
    return reference_map


# 测试用例1: 顿号分隔
test_spec1 = """1电动工具、2外壳、2L左侧外壳、2R右侧外壳、2S螺钉、3后盖、3S螺钉、4锤子壳体(壳体)、4A凸部、5锤子壳体盖、5A罩部、5B环部、5C挂钩部、5D开口、5E凹部、5F槽口、5H前端部、6马达、7减速机构(传递机构)、8主轴(传递机构)、8A凸缘部、8B主轴转轴部、8C周壁部、8D主轴沟、9打击机构(传递机构)、10砧座(输出部)、10A工具孔、10B主轴凸部、11工具头套筒、12风扇、12A衬套、13蓄电池装配部、14触发开关、15正反转切换杆、16操作面板、16A打击力开关、16B专用开关、17手边模式切换按钮、18灯单元、19进气口、20排气口"""

# 测试用例2: 省略号分隔
test_spec2 = """1…电动工具、2…外壳、2L…左侧外壳、2R…右侧外壳、2S…螺钉、3…后盖、3S…螺钉"""

# 测试用例3: 标准格式
test_spec3 = """1. 电动工具
2. 外壳
2L. 左侧外壳
2R. 右侧外壳
3. 后盖"""

def test_spec(spec_text, test_name):
    print(f"\n{'='*80}")
    print(f"测试: {test_name}")
    print(f"{'='*80}")
    print("说明书内容:")
    print(spec_text[:100] + ("..." if len(spec_text) > 100 else ""))
    print()
    
    result = extract_reference_markers(spec_text)
    
    print(f"提取到 {len(result)} 个附图标记:\n")
    for number, name in sorted(result.items(), key=lambda x: (len(x[0]), x[0]))[:10]:
        print(f"  {number}: {name}")
    
    if len(result) > 10:
        print(f"  ... (还有 {len(result) - 10} 个)")
    
    print()
    if len(result) > 0:
        print(f"✅ 成功提取到 {len(result)} 个附图标记")
    else:
        print("❌ 未能提取到任何附图标记")
    
    return result

# 运行所有测试
result1 = test_spec(test_spec1, "顿号分隔格式")
result2 = test_spec(test_spec2, "省略号分隔格式")
result3 = test_spec(test_spec3, "标准格式")

print("\n" + "="*80)
print("总结")
print("="*80)
print(f"测试1 (顿号): {len(result1)} 个标记")
print(f"测试2 (省略号): {len(result2)} 个标记")
print(f"测试3 (标准): {len(result3)} 个标记")

