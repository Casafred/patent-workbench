import sys
import traceback

print("Testing imports...")

try:
    print("1. Importing config...")
    from backend.scraper.config import ScrapingConfig
    print("   ✓ Config imported successfully")
except Exception as e:
    print(f"   ✗ Error: {e}")
    traceback.print_exc()

try:
    print("2. Loading browser_manager module...")
    import importlib.util
    spec = importlib.util.spec_from_file_location('browser_manager', 'backend/scraper/browser_manager.py')
    module = importlib.util.module_from_spec(spec)
    
    print("3. Executing module...")
    spec.loader.exec_module(module)
    
    print(f"4. Module contents: {[x for x in dir(module) if not x.startswith('_')]}")
    
    if hasattr(module, 'PlaywrightBrowserManager'):
        print("   ✓ PlaywrightBrowserManager found!")
    else:
        print("   ✗ PlaywrightBrowserManager NOT found!")
        
except Exception as e:
    print(f"   ✗ Error: {e}")
    traceback.print_exc()
