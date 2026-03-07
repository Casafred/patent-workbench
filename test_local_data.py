import json
import os

DATA_FILE = os.path.join('backend', 'data', 'ipc_data.json')

with open(DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

all_entries = data.get('all_entries', {})

# 测试查找不同分类号的标题
symbols = ['H04L', 'H04', 'G06F17', 'G06', 'A61K31', 'A61K', 'G06F17/00']

for symbol in symbols:
    symbol_normalized = symbol.replace(' ', '').upper()
    
    # 精确匹配
    if symbol_normalized in all_entries:
        entry = all_entries[symbol_normalized]
        print(f"{symbol}: {entry.get('title1', '')[:80]}...")
    else:
        # 前缀匹配
        found = False
        for code, entry in all_entries.items():
            if code.startswith(symbol_normalized) or symbol_normalized.startswith(code):
                print(f"{symbol}: (partial match with {code}) {entry.get('title1', '')[:60]}...")
                found = True
                break
        
        if not found:
            print(f"{symbol}: Not found in local data")
