"""
Test script for RapidOCR migration.

This script tests the basic functionality of the migrated OCR system.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test that all required modules can be imported."""
    print("Testing imports...")
    try:
        from backend.utils.ocr_utils import (
            initialize_ocr_engine,
            transform_rapidocr_result,
            filter_alphanumeric_markers,
            perform_ocr,
            deduplicate_results,
            filter_by_confidence,
            match_with_reference_map,
            calculate_statistics
        )
        print("✓ All imports successful")
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False


def test_ocr_engine_initialization():
    """Test RapidOCR engine initialization."""
    print("\nTesting OCR engine initialization...")
    try:
        from backend.utils.ocr_utils import initialize_ocr_engine
        engine = initialize_ocr_engine()
        if engine is not None:
            print("✓ OCR engine initialized successfully")
            return True
        else:
            print("✗ OCR engine is None")
            return False
    except Exception as e:
        print(f"✗ Initialization failed: {e}")
        return False


def test_transform_function():
    """Test result transformation function."""
    print("\nTesting result transformation...")
    try:
        from backend.utils.ocr_utils import transform_rapidocr_result
        
        # Mock RapidOCR result
        mock_result = [
            [[[10, 10], [30, 10], [30, 30], [10, 30]], '1', 0.95],
            [[[50, 50], [70, 50], [70, 70], [50, 70]], '2A', 0.88]
        ]
        
        transformed = transform_rapidocr_result(mock_result)
        
        if len(transformed) == 2:
            if transformed[0]['number'] == '1' and transformed[0]['confidence'] == 95.0:
                if transformed[1]['number'] == '2A' and transformed[1]['confidence'] == 88.0:
                    print("✓ Transformation works correctly")
                    return True
        
        print(f"✗ Transformation produced unexpected results: {transformed}")
        return False
    except Exception as e:
        print(f"✗ Transformation failed: {e}")
        return False


def test_alphanumeric_filter():
    """Test alphanumeric marker filtering."""
    print("\nTesting alphanumeric filtering...")
    try:
        from backend.utils.ocr_utils import filter_alphanumeric_markers
        
        # Mock OCR results with mixed content
        mock_results = [
            {'number': '1', 'x': 10, 'y': 10, 'width': 20, 'height': 20, 'confidence': 95},
            {'number': '2A', 'x': 50, 'y': 50, 'width': 20, 'height': 20, 'confidence': 88},
            {'number': '中文', 'x': 100, 'y': 100, 'width': 40, 'height': 20, 'confidence': 90},
            {'number': '!!!', 'x': 150, 'y': 150, 'width': 20, 'height': 20, 'confidence': 85},
            {'number': '10B', 'x': 200, 'y': 200, 'width': 30, 'height': 20, 'confidence': 92}
        ]
        
        filtered = filter_alphanumeric_markers(mock_results)
        
        # Should keep: 1, 2A, 10B
        # Should filter out: 中文, !!!
        if len(filtered) == 3:
            numbers = [r['number'] for r in filtered]
            if '1' in numbers and '2A' in numbers and '10B' in numbers:
                print(f"✓ Filtering works correctly: {numbers}")
                return True
        
        print(f"✗ Filtering produced unexpected results: {[r['number'] for r in filtered]}")
        return False
    except Exception as e:
        print(f"✗ Filtering failed: {e}")
        return False


def test_utility_functions():
    """Test utility functions remain functional."""
    print("\nTesting utility functions...")
    try:
        from backend.utils.ocr_utils import (
            deduplicate_results,
            filter_by_confidence,
            match_with_reference_map,
            calculate_statistics
        )
        
        # Test deduplicate_results
        duplicates = [
            {'number': '1', 'x': 10, 'y': 10, 'width': 20, 'height': 20, 'confidence': 95},
            {'number': '1', 'x': 12, 'y': 11, 'width': 20, 'height': 20, 'confidence': 90},
            {'number': '2', 'x': 100, 'y': 100, 'width': 20, 'height': 20, 'confidence': 88}
        ]
        deduped = deduplicate_results(duplicates, position_threshold=20)
        if len(deduped) != 2:
            print(f"✗ Deduplication failed: expected 2, got {len(deduped)}")
            return False
        
        # Test filter_by_confidence
        low_conf = [
            {'number': '1', 'confidence': 95},
            {'number': '2', 'confidence': 50},
            {'number': '3', 'confidence': 70}
        ]
        filtered = filter_by_confidence(low_conf, min_confidence=60)
        if len(filtered) != 2:
            print(f"✗ Confidence filtering failed: expected 2, got {len(filtered)}")
            return False
        
        # Test match_with_reference_map
        detected = [
            {'number': '1', 'x': 10, 'y': 10, 'confidence': 95},
            {'number': '2', 'x': 50, 'y': 50, 'confidence': 88},
            {'number': '99', 'x': 100, 'y': 100, 'confidence': 90}
        ]
        reference = {'1': '底座', '2': '旋转臂', '3': '夹紧装置'}
        matched, unknown, missing = match_with_reference_map(detected, reference)
        
        if len(matched) != 2 or len(unknown) != 1 or len(missing) != 1:
            print(f"✗ Matching failed: matched={len(matched)}, unknown={len(unknown)}, missing={len(missing)}")
            return False
        
        # Test calculate_statistics
        stats = calculate_statistics(2, 3, detected)
        if 'match_rate' not in stats or 'avg_confidence' not in stats:
            print(f"✗ Statistics calculation failed: {stats}")
            return False
        
        print("✓ All utility functions work correctly")
        return True
    except Exception as e:
        print(f"✗ Utility function test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("RapidOCR Migration Test Suite")
    print("=" * 60)
    
    tests = [
        test_imports,
        test_ocr_engine_initialization,
        test_transform_function,
        test_alphanumeric_filter,
        test_utility_functions
    ]
    
    results = []
    for test in tests:
        try:
            results.append(test())
        except Exception as e:
            print(f"\n✗ Test crashed: {e}")
            import traceback
            traceback.print_exc()
            results.append(False)
    
    print("\n" + "=" * 60)
    print(f"Test Results: {sum(results)}/{len(results)} passed")
    print("=" * 60)
    
    if all(results):
        print("\n✓ All tests passed! Basic functionality is working.")
        return 0
    else:
        print("\n✗ Some tests failed. Please review the errors above.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
