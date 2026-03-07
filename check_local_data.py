import json
import os

DATA_FILE = os.path.join('backend', 'data', 'ipc_data.json')

with open(DATA_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

all_entries = data.get('all_entries', {})

print(f"Total entries: {len(all_entries)}")

# 显示前10个条目
print("\nFirst 10 entries:")
for i, (code, entry) in enumerate(list(all_entries.items())[:10]):
    print(f"  {code}: {entry.get('title1', '')[:60]}...")

# 检查是否有 H04L
if 'H04L' in all_entries:
    print(f"\nH04L found: {all_entries['H04L'].get('title1', '')}")
else:
    print(f"\nH04L not found")

# 检查是否有 H04
if 'H04' in all_entries:
    print(f"H04 found: {all_entries['H04'].get('title1', '')}")
else:
    print(f"H04 not found")

# 检查是否有以 H04 开头的条目
print("\nEntries starting with H04:")
count = 0
for code, entry in all_entries.items():
    if code.startswith('H04'):
        print(f"  {code}: {entry.get('title1', '')[:60]}...")
        count += 1
        if count >= 10:
            break

if count == 0:
    print("  None found")
