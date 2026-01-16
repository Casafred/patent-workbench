from google_patent_scraper import scraper_class

scraper = scraper_class()
err, soup, url = scraper.request_single_patent('US2668287A')
print(f'Error: {err}')
print(f'URL: {url}')
if not err:
    print('Parsed patents:', scraper.parsed_patents)