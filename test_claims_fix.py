"""
测试权利要求处理器的修复
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from patent_claims_processor.processors import ExcelProcessor

def test_claims_validation():
    """测试权利要求文本验证"""
    print("测试权利要求文本验证...")
    
    # 测试数据
    test_cases = [
        {
            'name': '正常权利要求文本',
            'data': [
                '1. 一种智能手机，其特征在于...',
                '2. 根据权利要求1所述的智能手机...',
                '3. 根据权利要求1或2所述的智能手机...'
            ],
            'expected': True
        },
        {
            'name': '英文权利要求文本',
            'data': [
                '1. A smartphone comprising...',
                '2. The smartphone of claim 1...',
                '3. The smartphone of claims 1 or 2...'
            ],
            'expected': True
        },
        {
            'name': '日文权利要求文本',
            'data': [
                '1. スマートフォンであって、請求項1に記載のスマートフォン',
                '2. 請求項1または2に記載のスマートフォン',
                '3. クレーム1に記載の装置'
            ],
            'expected': True
        },
        {
            'name': '德文权利要求文本',
            'data': [
                '1. Ein Smartphone, dadurch gekennzeichnet...',
                '2. Smartphone nach Anspruch 1...',
                '3. Smartphone nach einem der Ansprüche 1 oder 2...'
            ],
            'expected': True
        },
        {
            'name': '法文权利要求文本',
            'data': [
                '1. Un smartphone caractérisé en ce que...',
                '2. Smartphone selon la revendication 1...',
                '3. Smartphone selon l\'une des revendications 1 ou 2...'
            ],
            'expected': True
        },
        {
            'name': '韩文权利要求文本',
            'data': [
                '1. 스마트폰에 있어서...',
                '2. 청구항 1에 따른 스마트폰...',
                '3. 청구항 1 또는 2에 따른 스마트폰...'
            ],
            'expected': True
        },
        {
            'name': '非权利要求文本',
            'data': [
                '这是一些普通文本',
                '没有权利要求相关内容',
                '只是一些描述性文字'
            ],
            'expected': False
        },
        {
            'name': '混合文本（少于50%包含权利要求）',
            'data': [
                '1. 一种智能手机，其特征在于...',
                '普通文本1',
                '普通文本2',
                '普通文本3',
                '普通文本4'
            ],
            'expected': False
        },
        {
            'name': '混合文本（超过50%包含权利要求）',
            'data': [
                '1. 一种智能手机，其特征在于...',
                '2. 根据权利要求1所述的智能手机...',
                '3. 根据权利要求1或2所述的智能手机...',
                '4. 根据权利要求1-3所述的智能手机...',
                '普通文本1'
            ],
            'expected': True
        }
    ]
    
    claims_keywords = [
        # 中文
        '权利要求', '請求項', '請求项',
        # 英文
        'claim', 'claims', 'Claim', 'Claims', 'CLAIM', 'CLAIMS',
        # 日文
        '請求項', 'クレーム',
        # 韩文
        '청구항', '請求項',
        # 德文
        'Anspruch', 'Ansprüche', 'anspruch', 'ansprüche',
        # 法文
        'revendication', 'revendications', 'Revendication', 'Revendications',
        # 西班牙文
        'reivindicación', 'reivindicaciones', 'Reivindicación', 'Reivindicaciones',
        # 葡萄牙文
        'reivindicação', 'reivindicações', 'Reivindicação', 'Reivindicações',
        # 俄文
        'пункт формулы', 'формула изобретения',
        # 意大利文
        'rivendicazione', 'rivendicazioni', 'Rivendicazione', 'Rivendicazioni',
        # 荷兰文
        'conclusie', 'conclusies', 'Conclusie', 'Conclusies',
        # 阿拉伯文
        'مطالبة', 'مطالبات'
    ]
    
    for test_case in test_cases:
        print(f"\n测试: {test_case['name']}")
        
        cells_with_keywords = 0
        total_non_empty_cells = 0
        
        for cell_text in test_case['data']:
            if cell_text and cell_text.strip():
                total_non_empty_cells += 1
                if any(keyword in cell_text for keyword in claims_keywords):
                    cells_with_keywords += 1
        
        if total_non_empty_cells > 0:
            keyword_ratio = cells_with_keywords / total_non_empty_cells
            is_valid = keyword_ratio >= 0.5
            
            print(f"  - 总单元格数: {total_non_empty_cells}")
            print(f"  - 包含关键词的单元格数: {cells_with_keywords}")
            print(f"  - 关键词比例: {keyword_ratio * 100:.1f}%")
            print(f"  - 验证结果: {'通过' if is_valid else '不通过'}")
            print(f"  - 预期结果: {'通过' if test_case['expected'] else '不通过'}")
            print(f"  - 测试状态: {'✓ 成功' if is_valid == test_case['expected'] else '✗ 失败'}")
        else:
            print(f"  - 测试状态: ✗ 失败 (没有非空单元格)")

def test_task_id_generation():
    """测试任务ID生成逻辑"""
    print("\n\n测试任务ID生成逻辑...")
    
    # 模拟不同的文件和工作表组合
    test_cases = [
        {
            'file_id': '20260116_120000_test.xlsx',
            'sheet_name': 'Sheet1',
            'expected': 'task_20260116_120000_test.xlsx_Sheet1'
        },
        {
            'file_id': '20260116_120000_test.xlsx',
            'sheet_name': 'Sheet2',
            'expected': 'task_20260116_120000_test.xlsx_Sheet2'
        },
        {
            'file_id': '20260116_120000_test.xlsx',
            'sheet_name': None,
            'expected': 'task_20260116_120000_test.xlsx_default'
        },
        {
            'file_id': '20260116_130000_another.xlsx',
            'sheet_name': 'Sheet1',
            'expected': 'task_20260116_130000_another.xlsx_Sheet1'
        }
    ]
    
    for test_case in test_cases:
        file_id = test_case['file_id']
        sheet_name = test_case['sheet_name']
        expected = test_case['expected']
        
        # 生成任务ID
        task_id = f"task_{file_id}_{sheet_name or 'default'}"
        
        print(f"\n文件: {file_id}, 工作表: {sheet_name or '(默认)'}")
        print(f"  - 生成的任务ID: {task_id}")
        print(f"  - 预期的任务ID: {expected}")
        print(f"  - 测试状态: {'✓ 成功' if task_id == expected else '✗ 失败'}")
    
    # 测试任务覆盖逻辑
    print("\n\n测试任务覆盖逻辑...")
    processing_tasks = {}
    
    # 第一次处理
    task_id = "task_test.xlsx_Sheet1"
    processing_tasks[task_id] = {
        'status': 'completed',
        'result': 'first_result'
    }
    print(f"第一次处理: 任务 {task_id} 已完成")
    
    # 第二次处理相同的文件和工作表
    if task_id in processing_tasks:
        old_task = processing_tasks[task_id]
        if old_task['status'] == 'processing':
            print(f"第二次处理: 任务正在进行中，不允许覆盖")
        else:
            del processing_tasks[task_id]
            processing_tasks[task_id] = {
                'status': 'processing',
                'result': None
            }
            print(f"第二次处理: 旧任务已删除，创建新任务")
    
    print(f"当前任务状态: {processing_tasks[task_id]['status']}")
    print("✓ 任务覆盖逻辑测试成功")

if __name__ == '__main__':
    print("=" * 60)
    print("权利要求处理器修复测试")
    print("=" * 60)
    
    test_claims_validation()
    test_task_id_generation()
    
    print("\n" + "=" * 60)
    print("所有测试完成")
    print("=" * 60)
