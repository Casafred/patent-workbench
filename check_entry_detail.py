import json
import os

DATA_FILE = os.path.join('backend', 'data', 'ipc_data.json')

with open(DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

all_entries = data.get('all_entries', {})

# 检查 H04 和 H04L 的完整数据
for symbol in ['H04', 'H04L', 'G06', 'G06F', 'A61K']:
    if symbol in all_entries:
        entry = all_entries[symbol]
        print(f"\n{symbol}:")
        for key, value in entry.items():
            if value:
                print(f"  {key}: {str(value)[:80]}...")
    else:
        print(f"\n{symbol}: Not found")
