import requests

r = requests.get('http://127.0.0.1:5001/api/ipc/hierarchy?symbol=G06F')
import json
print(json.dumps(r.json(), indent=2, ensure_ascii=False))
