"""
测试字符编码修复
"""

from backend.scraper.simple_scraper import SimplePatentScraper

def test_encoding():
    """测试中文字符编码是否正确"""
    scraper = SimplePatentScraper(delay=1.0)
    
    # 测试一个包含中文发明人的专利
    # JP2020202510A - 日本专利，包含日文字符
    test_patents = ['JP2020202510A', 'CN101234567A']
    
    print("开始测试字符编码...")
    print("=" * 60)
    
    results = scraper.scrape_patents_batch(test_patents)
    
    for result in results:
        print(f"\n专利号: {result.patent_number}")
        print(f"成功: {result.success}")
        
        if result.success and result.data:
            data = result.data
            print(f"标题: {data.title}")
            print(f"发明人: {', '.join(data.inventors)}")
            print(f"受让人: {', '.join(data.assignees)}")
            print(f"申请日期: {data.application_date}")
            print(f"公开日期: {data.publication_date}")
            
            # 检查是否有乱码
            all_text = f"{data.title} {' '.join(data.inventors)} {' '.join(data.assignees)}"
            if 'è' in all_text or 'å' in all_text or '¤' in all_text:
                print("⚠️ 警告: 检测到可能的乱码字符！")
            else:
                print("✅ 字符编码正常")
        else:
            print(f"错误: {result.error}")
        
        print("-" * 60)
    
    scraper.close()

if __name__ == '__main__':
    test_encoding()
