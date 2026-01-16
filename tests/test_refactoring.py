"""Quick test script for refactored modules."""

import sys
sys.path.insert(0, '.')

print("Testing refactored modules...")
print("=" * 50)

try:
    print("\n1. Testing config...")
    from backend.config import Config
    print(f"   ✓ Config loaded: SECRET_KEY exists = {hasattr(Config, 'SECRET_KEY')}")
    
    print("\n2. Testing extensions...")
    from backend.extensions import init_extensions
    print(f"   ✓ Extensions loaded: init_extensions exists = {callable(init_extensions)}")
    
    print("\n3. Testing utils...")
    from backend.utils import create_response, allowed_file
    print(f"   ✓ Utils loaded: create_response exists = {callable(create_response)}")
    
    print("\n4. Testing services...")
    from backend.services import AuthService, get_zhipu_client
    print(f"   ✓ Services loaded: AuthService exists = {AuthService is not None}")
    
    print("\n5. Testing middleware...")
    from backend.middleware import login_required, validate_api_request
    print(f"   ✓ Middleware loaded: login_required exists = {callable(login_required)}")
    
    print("\n6. Testing auth routes...")
    from backend.routes.auth import auth_bp
    print(f"   ✓ Auth routes loaded: blueprint name = {auth_bp.name}")
    
    print("\n7. Testing chat routes...")
    from backend.routes.chat import chat_bp
    print(f"   ✓ Chat routes loaded: blueprint name = {chat_bp.name}")
    
    print("\n8. Testing async_batch routes...")
    from backend.routes.async_batch import async_batch_bp
    print(f"   ✓ Async batch routes loaded: blueprint name = {async_batch_bp.name}")
    
    print("\n9. Testing files routes...")
    from backend.routes.files import files_bp
    print(f"   ✓ Files routes loaded: blueprint name = {files_bp.name}")
    
    print("\n10. Testing patent routes...")
    from backend.routes.patent import patent_bp
    print(f"   ✓ Patent routes loaded: blueprint name = {patent_bp.name}")
    
    print("\n11. Testing claims routes...")
    from backend.routes.claims import claims_bp
    print(f"   ✓ Claims routes loaded: blueprint name = {claims_bp.name}")
    
    print("\n12. Testing main application factory...")
    from backend.app import create_app
    print(f"   ✓ Application factory loaded: create_app exists = {callable(create_app)}")
    
    print("\n" + "=" * 50)
    print("✅ All modules loaded successfully!")
    print("=" * 50)
    print("\n📋 Next Steps:")
    print("   1. Run: python app_new.py")
    print("   2. Test all endpoints manually")
    print("   3. If all works, replace original app.py")
    print("=" * 50)
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
