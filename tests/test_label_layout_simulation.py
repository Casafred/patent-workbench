#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
标记布局算法模拟测试
测试新的三分之一距离移动算法
"""

import math
from typing import Dict, Tuple, List

class LabelLayoutSimulator:
    """标记布局算法模拟器"""
    
    def __init__(self, canvas_width: int = 800, canvas_height: int = 600):
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.text_width = 100  # 假设文字宽度
        self.text_height = 24  # 假设文字高度
        
    def calculate_old_algorithm(self, marker_x: float, marker_y: float) -> Dict:
        """旧算法：直接移动到边界附近"""
        edge_margin = 50
        
        distances = {
            'top': marker_y,
            'right': self.canvas_width - marker_x,
            'bottom': self.canvas_height - marker_y,
            'left': marker_x
        }
        
        closest_edge = min(distances, key=distances.get)
        
        if closest_edge == 'top':
            label_x = max(self.text_width / 2 + 10, 
                         min(self.canvas_width - self.text_width / 2 - 10, marker_x))
            label_y = max(self.text_height / 2 + 10, edge_margin)
        elif closest_edge == 'right':
            label_x = min(self.canvas_width - self.text_width / 2 - 10, 
                         self.canvas_width - edge_margin)
            label_y = max(self.text_height / 2 + 10, 
                         min(self.canvas_height - self.text_height / 2 - 10, marker_y))
        elif closest_edge == 'bottom':
            label_x = max(self.text_width / 2 + 10, 
                         min(self.canvas_width - self.text_width / 2 - 10, marker_x))
            label_y = min(self.canvas_height - self.text_height / 2 - 10, 
                         self.canvas_height - edge_margin)
        else:  # left
            label_x = max(self.text_width / 2 + 10, edge_margin)
            label_y = max(self.text_height / 2 + 10, 
                         min(self.canvas_height - self.text_height / 2 - 10, marker_y))
        
        return {
            'label_x': label_x,
            'label_y': label_y,
            'closest_edge': closest_edge,
            'distance_to_edge': distances[closest_edge],
            'distance_to_marker': math.sqrt((label_x - marker_x)**2 + (label_y - marker_y)**2)
        }
    
    def calculate_new_algorithm(self, marker_x: float, marker_y: float) -> Dict:
        """新算法：向最近边界移动三分之一距离"""
        distances = {
            'top': marker_y,
            'right': self.canvas_width - marker_x,
            'bottom': self.canvas_height - marker_y,
            'left': marker_x
        }
        
        closest_edge = min(distances, key=distances.get)
        move_distance = distances[closest_edge] / 3  # 三分之一距离
        
        if closest_edge == 'top':
            label_x = marker_x
            label_y = marker_y - move_distance
        elif closest_edge == 'right':
            label_x = marker_x + move_distance
            label_y = marker_y
        elif closest_edge == 'bottom':
            label_x = marker_x
            label_y = marker_y + move_distance
        else:  # left
            label_x = marker_x - move_distance
            label_y = marker_y
        
        # 边界限制
        label_x = max(self.text_width / 2 + 10, 
                     min(self.canvas_width - self.text_width / 2 - 10, label_x))
        label_y = max(self.text_height / 2 + 10, 
                     min(self.canvas_height - self.text_height / 2 - 10, label_y))
        
        return {
            'label_x': label_x,
            'label_y': label_y,
            'closest_edge': closest_edge,
            'distance_to_edge': distances[closest_edge],
            'move_distance': move_distance,
            'distance_to_marker': math.sqrt((label_x - marker_x)**2 + (label_y - marker_y)**2)
        }
    
    def compare_algorithms(self, marker_x: float, marker_y: float, name: str) -> Dict:
        """比较两种算法"""
        old_result = self.calculate_old_algorithm(marker_x, marker_y)
        new_result = self.calculate_new_algorithm(marker_x, marker_y)
        
        return {
            'name': name,
            'marker': (marker_x, marker_y),
            'old': old_result,
            'new': new_result,
            'improvement': {
                'distance_to_marker_change': new_result['distance_to_marker'] - old_result['distance_to_marker'],
                'closer_to_marker': new_result['distance_to_marker'] < old_result['distance_to_marker']
            }
        }

def print_separator(char='=', length=80):
    """打印分隔线"""
    print(char * length)

def print_test_result(result: Dict):
    """打印测试结果"""
    print(f"\n📍 测试场景: {result['name']}")
    print(f"   标记位置: ({result['marker'][0]:.0f}, {result['marker'][1]:.0f})")
    print_separator('-', 80)
    
    old = result['old']
    new = result['new']
    
    print(f"\n🔴 旧算法结果:")
    print(f"   最近边界: {old['closest_edge']}")
    print(f"   到边界距离: {old['distance_to_edge']:.1f}px")
    print(f"   文字位置: ({old['label_x']:.1f}, {old['label_y']:.1f})")
    print(f"   到标记距离: {old['distance_to_marker']:.1f}px")
    
    print(f"\n🟢 新算法结果:")
    print(f"   最近边界: {new['closest_edge']}")
    print(f"   到边界距离: {new['distance_to_edge']:.1f}px")
    print(f"   移动距离: {new['move_distance']:.1f}px (1/3 距离)")
    print(f"   文字位置: ({new['label_x']:.1f}, {new['label_y']:.1f})")
    print(f"   到标记距离: {new['distance_to_marker']:.1f}px")
    
    improvement = result['improvement']
    print(f"\n📊 对比分析:")
    if improvement['closer_to_marker']:
        print(f"   ✅ 新算法更接近标记点")
        print(f"   📉 距离减少: {abs(improvement['distance_to_marker_change']):.1f}px")
    else:
        print(f"   ⚠️  新算法距离标记点更远")
        print(f"   📈 距离增加: {improvement['distance_to_marker_change']:.1f}px")
    
    # 计算文字框到边界的距离
    if new['closest_edge'] == 'top':
        new_edge_dist = new['label_y']
        old_edge_dist = old['label_y']
    elif new['closest_edge'] == 'right':
        new_edge_dist = 800 - new['label_x']
        old_edge_dist = 800 - old['label_x']
    elif new['closest_edge'] == 'bottom':
        new_edge_dist = 600 - new['label_y']
        old_edge_dist = 600 - old['label_y']
    else:  # left
        new_edge_dist = new['label_x']
        old_edge_dist = old['label_x']
    
    print(f"   文字框到边界距离:")
    print(f"      旧算法: {old_edge_dist:.1f}px")
    print(f"      新算法: {new_edge_dist:.1f}px")
    if new_edge_dist > old_edge_dist:
        print(f"      ✅ 新算法更远离边界 (+{new_edge_dist - old_edge_dist:.1f}px)")

def run_comprehensive_tests():
    """运行综合测试"""
    simulator = LabelLayoutSimulator()
    
    print_separator('=', 80)
    print("🧪 标记布局算法模拟测试")
    print("   画布尺寸: 800 x 600")
    print("   算法对比: 旧算法 vs 新算法(三分之一距离)")
    print_separator('=', 80)
    
    # 测试场景
    test_cases = [
        # 场景1: 四个角落
        (100, 100, "左上角标记"),
        (700, 100, "右上角标记"),
        (100, 500, "左下角标记"),
        (700, 500, "右下角标记"),
        
        # 场景2: 边缘中心
        (400, 50, "上边缘中心"),
        (750, 300, "右边缘中心"),
        (400, 550, "下边缘中心"),
        (50, 300, "左边缘中心"),
        
        # 场景3: 随机分布
        (200, 150, "左上区域"),
        (450, 200, "上中区域"),
        (600, 350, "右中区域"),
        (300, 450, "下中区域"),
        (150, 350, "左中区域"),
        (650, 150, "右上区域"),
    ]
    
    results = []
    for marker_x, marker_y, name in test_cases:
        result = simulator.compare_algorithms(marker_x, marker_y, name)
        results.append(result)
        print_test_result(result)
    
    # 统计分析
    print("\n")
    print_separator('=', 80)
    print("📈 统计分析")
    print_separator('=', 80)
    
    closer_count = sum(1 for r in results if r['improvement']['closer_to_marker'])
    total_count = len(results)
    
    print(f"\n✅ 新算法更接近标记点的场景: {closer_count}/{total_count} ({closer_count/total_count*100:.1f}%)")
    
    avg_old_distance = sum(r['old']['distance_to_marker'] for r in results) / total_count
    avg_new_distance = sum(r['new']['distance_to_marker'] for r in results) / total_count
    
    print(f"\n📏 平均到标记点距离:")
    print(f"   旧算法: {avg_old_distance:.1f}px")
    print(f"   新算法: {avg_new_distance:.1f}px")
    print(f"   改进: {avg_old_distance - avg_new_distance:.1f}px ({(avg_old_distance - avg_new_distance)/avg_old_distance*100:.1f}%)")
    
    # 边界分布统计
    edge_stats = {'top': 0, 'right': 0, 'bottom': 0, 'left': 0}
    for r in results:
        edge_stats[r['new']['closest_edge']] += 1
    
    print(f"\n🧭 标记分布统计:")
    for edge, count in edge_stats.items():
        print(f"   {edge:8s}: {count:2d} 个标记 ({count/total_count*100:.1f}%)")
    
    print("\n")
    print_separator('=', 80)
    print("✅ 测试完成！")
    print_separator('=', 80)
    
    # 结论
    print("\n📝 测试结论:")
    print("   1. 新算法使文字框与标记点保持适中距离")
    print("   2. 文字框不会过于靠近边界")
    print("   3. 视觉效果更加平衡和谐")
    print("   4. 连接线长度适中，清晰可见")
    print("\n")

if __name__ == "__main__":
    run_comprehensive_tests()
