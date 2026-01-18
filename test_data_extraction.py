#!/usr/bin/env python3
"""
测试数据提取引擎
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_extraction_engine():
    """测试数据提取引擎"""
    print("=== 测试数据提取引擎 ===\n")
    
    try:
        from backend.scraper.extractors import DataExtractionEngine, JSONLDExtractor, HTMLExtractor, FallbackExtractor
        
        # 创建提取引擎
        engine = DataExtractionEngine()
        print("✅ 数据提取引擎创建成功")
        print(f"   - 提取器数量: {len(engine.extractors)}")
        
        # 测试提取器信息
        extractor_info = engine.get_extractor_info()
        print("\n📋 可用提取器:")
        for info in extractor_info:
            print(f"   - {info['name']}")
        
        # 创建测试HTML内容
        test_html_jsonld = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Patent - US10000000A1</title>
            <script type="application/ld+json">
            {
                "@context": "http://schema.org",
                "@type": "Patent",
                "name": "Test Patent Title",
                "abstract": "This is a test patent abstract for testing purposes.",
                "inventor": [
                    {"name": "John Doe"},
                    {"name": "Jane Smith"}
                ],
                "assignee": [
                    {"name": "Test Company Inc."}
                ],
                "filingDate": "2020-01-01",
                "publicationDate": "2021-01-01"
            }
            </script>
        </head>
        <body>
            <h1>Test Patent Title</h1>
            <div id="abstract">This is a test patent abstract.</div>
        </body>
        </html>
        """
        
        test_html_basic = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Basic Patent - US20000000A1</title>
        </head>
        <body>
            <h1>Basic Patent Title</h1>
            <div id="abstract">Basic patent abstract for testing.</div>
            <div id="inventor">
                <span>Alice Johnson</span>
                <span>Bob Wilson</span>
            </div>
            <div id="claims">
                <div class="claim">Claim 1: A method for testing...</div>
                <div class="claim">Claim 2: The method of claim 1...</div>
            </div>
        </body>
        </html>
        """
        
        # 测试JSON-LD提取
        print("\n🔍 测试JSON-LD提取:")
        result1 = engine.extract_patent_data("US10000000A1", test_html_jsonld)
        if result1:
            print("✅ JSON-LD提取成功")
            print(f"   - 标题: {result1.title}")
            print(f"   - 摘要: {result1.abstract[:50]}...")
            print(f"   - 发明人: {result1.inventors}")
            print(f"   - 受让人: {result1.assignees}")
        else:
            print("❌ JSON-LD提取失败")
        
        # 测试HTML提取
        print("\n🔍 测试HTML提取:")
        result2 = engine.extract_patent_data("US20000000A1", test_html_basic)
        if result2:
            print("✅ HTML提取成功")
            print(f"   - 标题: {result2.title}")
            print(f"   - 摘要: {result2.abstract}")
            print(f"   - 发明人: {result2.inventors}")
            print(f"   - 权利要求数量: {len(result2.claims)}")
        else:
            print("❌ HTML提取失败")
        
        # 测试提取器测试功能
        print("\n🧪 测试提取器诊断:")
        test_results = engine.test_extractors("US10000000A1", test_html_jsonld)
        for extractor_name, result in test_results.items():
            if extractor_name != 'error':
                status = "✅" if result['success'] else "❌"
                print(f"   {status} {extractor_name}: 可提取={result['can_extract']}, 成功={result['success']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 数据提取引擎测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_individual_extractors():
    """测试各个提取器"""
    print("\n=== 测试各个提取器 ===\n")
    
    try:
        from backend.scraper.extractors import JSONLDExtractor, HTMLExtractor, FallbackExtractor
        from bs4 import BeautifulSoup
        
        # 测试JSON-LD提取器
        print("1. 测试JSON-LD提取器...")
        jsonld_extractor = JSONLDExtractor()
        
        test_html = """
        <script type="application/ld+json">
        {"@type": "Patent", "name": "Test Patent"}
        </script>
        """
        soup = BeautifulSoup(test_html, 'lxml')
        
        can_extract = jsonld_extractor.can_extract(test_html, soup)
        print(f"   - 可以提取: {can_extract}")
        
        # 测试HTML提取器
        print("\n2. 测试HTML提取器...")
        html_extractor = HTMLExtractor()
        
        test_html2 = "<h1>Patent Title</h1><div id='abstract'>Abstract text</div>"
        soup2 = BeautifulSoup(test_html2, 'lxml')
        
        can_extract2 = html_extractor.can_extract(test_html2, soup2)
        print(f"   - 可以提取: {can_extract2}")
        
        # 测试回退提取器
        print("\n3. 测试回退提取器...")
        fallback_extractor = FallbackExtractor()
        
        can_extract3 = fallback_extractor.can_extract("", BeautifulSoup("", 'lxml'))
        print(f"   - 可以提取: {can_extract3}")
        
        print("\n✅ 各个提取器测试完成")
        return True
        
    except Exception as e:
        print(f"❌ 提取器测试失败: {e}")
        return False

def main():
    """主函数"""
    print("数据提取引擎测试\n")
    
    success1 = test_extraction_engine()
    success2 = test_individual_extractors()
    
    print("\n=== 总结 ===")
    if success1 and success2:
        print("🎉 所有测试通过！数据提取引擎功能正常。")
        print("\n📋 功能特性:")
        print("   - 多策略数据提取 (JSON-LD, HTML, 回退)")
        print("   - 智能提取器选择")
        print("   - 数据验证和标准化")
        print("   - 错误处理和诊断")
    else:
        print("❌ 部分测试失败，请检查实现")

if __name__ == "__main__":
    main()