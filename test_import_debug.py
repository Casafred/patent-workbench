import importlib.util
import traceback

spec = importlib.util.spec_from_file_location('browser_manager', 'backend/scraper/browser_manager.py')
module = importlib.util.module_from_spec(spec)

try:
    spec.loader.exec_module(module)
    print("Module loaded successfully")
    print(f"Module contents: {dir(module)}")
except Exception as e:
    print(f"Error loading module: {e}")
    traceback.print_exc()
