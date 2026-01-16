"""
Test script to verify all backend modules can be imported correctly.

Run this script to ensure the refactored structure is working.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_imports():
    """Test all module imports."""
    print("Testing backend module imports...")
    
    try:
        # Test config
        print("✓ Testing config...")
        from backend import config
        assert hasattr(config, 'Config')
        print("  ✓ Config module OK")
        
        # Test extensions
        print("✓ Testing extensions...")
        from backend import extensions
        assert hasattr(extensions, 'init_extensions')
        print("  ✓ Extensions module OK")
        
        # Test utils
        print("✓ Testing utils...")
        from backend.utils import create_response, allowed_file
        print("  ✓ Utils module OK")
        
        # Test services
        print("✓ Testing services...")
        from backend.services import AuthService, get_zhipu_client
        print("  ✓ Services module OK")
        
        # Test middleware
        print("✓ Testing middleware...")
        from backend.middleware import login_required, validate_api_request
        print("  ✓ Middleware module OK")
        
        print("\n✅ All imports successful!")
        return True
        
    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = test_imports()
    sys.exit(0 if success else 1)
