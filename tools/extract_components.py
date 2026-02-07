#!/usr/bin/env python3
"""
HTML Component Extraction Tool
Extracts feature tab components from index.html
"""

import re
import os

# Component definitions
COMPONENTS = [
    {
        'task': '3.5',
        'name': 'Feature 2 (Async Batch)',
        'tab_id': 'async_batch-tab',
        'file': 'frontend/components/tabs/async-batch.html',
        'placeholder_id': 'async-batch-component',
        'start_marker': '<!-- 功能二：小批量异步',
        'end_marker': '<!-- 功能三：大批量处理'
    },
    {
        'task': '3.6',
        'name': 'Feature 3 (Large Batch)',
        'tab_id': 'large_batch-tab',
        'file': 'frontend/components/tabs/large-batch.html',
        'placeholder_id': 'large-batch-component',
        'start_marker': '<!-- 功能三：大批量处理',
        'end_marker': '<!-- 功能四：本地专利库管理'
    },
    {
        'task': '3.7',
        'name': 'Feature 4 (Local Patent Library)',
        'tab_id': 'local_patent_lib-tab',
        'file': 'frontend/components/tabs/local-patent-lib.html',
        'placeholder_id': 'local-patent-lib-component',
        'start_marker': '<!-- 功能四：本地专利库管理',
        'end_marker': '<!-- 功能五：权利要求对比'
    },
    {
        'task': '3.8',
        'name': 'Feature 5 (Claims Comparison)',
        'tab_id': 'claims_comparison-tab',
        'file': 'frontend/components/tabs/claims-comparison.html',
        'placeholder_id': 'claims-comparison-component',
        'start_marker': '<!-- 功能五：权利要求对比',
        'end_marker': '<!-- 功能六：批量专利解读'
    },
    {
        'task': '3.9',
        'name': 'Feature 6 (Patent Batch)',
        'tab_id': 'patent_batch-tab',
        'file': 'frontend/components/tabs/patent-batch.html',
        'placeholder_id': 'patent-batch-component',
        'start_marker': '<!-- 功能六：批量专利解读',
        'end_marker': '<!-- 功能七：权利要求处理'
    },
    {
        'task': '3.10',
        'name': 'Feature 7 (Claims Processor)',
        'tab_id': 'claims_processor-tab',
        'file': 'frontend/components/tabs/claims-processor.html',
        'placeholder_id': 'claims-processor-component',
        'start_marker': '<!-- 功能七：权利要求处理',
        'end_marker': '<!-- 功能八：专利附图标记'
    },
    {
        'task': '3.11',
        'name': 'Feature 8 (Drawing Marker)',
        'tab_id': 'drawing_marker-tab',
        'file': 'frontend/components/tabs/drawing-marker.html',
        'placeholder_id': 'drawing-marker-component',
        'start_marker': '<!-- 功能八：专利附图标记',
        'end_marker': '</div>\n    </div>\n\n    <!-- Vanta.js'
    }
]

def extract_components():
    """Extract all components from index.html"""
    
    # Read index.html
    with open('frontend/index.html', 'r', encoding='utf-8') as f:
        content = f.read()
    
    print("📖 Read frontend/index.html")
    
    # Extract each component
    for comp in COMPONENTS:
        print(f"\n🔄 Processing {comp['task']}: {comp['name']}")
        
        # Find start and end positions
        start_idx = content.find(comp['start_marker'])
        end_idx = content.find(comp['end_marker'], start_idx)
        
        if start_idx == -1 or end_idx == -1:
            print(f"  ❌ Could not find markers for {comp['name']}")
            continue
        
        # Extract component HTML
        component_html = content[start_idx:end_idx].strip()
        
        # Write component file
        os.makedirs(os.path.dirname(comp['file']), exist_ok=True)
        with open(comp['file'], 'w', encoding='utf-8') as f:
            f.write(component_html + '\n')
        
        print(f"  ✅ Created {comp['file']}")
        
        # Create placeholder
        placeholder = f"\n        <!-- {comp['name']} (loaded dynamically) -->\n        <div id=\"{comp['placeholder_id']}\"></div>\n        \n        "
        
        # Replace in content
        content = content[:start_idx] + placeholder + content[end_idx:]
        
        print(f"  ✅ Replaced with placeholder in index.html")
    
    # Write updated index.html
    with open('frontend/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("\n✅ Updated frontend/index.html")
    
    # Generate main.js component loading code
    print("\n📝 Component loading code for main.js:")
    print("```javascript")
    for comp in COMPONENTS:
        print(f"    // Load {comp['name']} component")
        print(f"    try {{")
        print(f"        await loadComponent('{comp['file']}', '{comp['placeholder_id']}');")
        print(f"        console.log('✅ {comp['name']} component loaded');")
        print(f"    }} catch (error) {{")
        print(f"        console.error('❌ Failed to load {comp['name']} component:', error);")
        print(f"    }}")
        print()
    print("```")

if __name__ == '__main__':
    extract_components()
