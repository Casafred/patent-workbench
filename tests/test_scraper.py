from backend.scraper.simple_scraper import SimplePatentScraper

# 创建爬虫实例
scraper = SimplePatentScraper()

# 测试爬取专利
print("测试爬取专利 US10000000...")
result = scraper.scrape_patent('US10000000', crawl_specification=True)

# 打印结果
print('专利号:', result.patent_number)
print('成功:', result.success)

if result.success and result.data:
    print('标题:', result.data.title)
    print('摘要:', result.data.abstract[:100] + '...')
    print('说明书:', result.data.description[:100] + '...')
    print('权利要求数量:', len(result.data.claims))
else:
    print('错误:', result.error)

print("\n测试完成!")
