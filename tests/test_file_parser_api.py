"""
Test script for File Parser API endpoints.

This script tests the new file parser API endpoints:
- POST /api/files/parser/create
- GET /api/files/parser/result/<task_id>

Usage:
    python test_file_parser_api.py
"""

import os
import sys
import requests
import time

# Configuration
BASE_URL = "http://localhost:5001"
API_BASE = f"{BASE_URL}/api"

# Test credentials (update these)
USERNAME = "test_user"
PASSWORD = "test_password"

# Test file path (update this to a real file)
TEST_FILE_PATH = "test_document.pdf"


def login(username, password):
    """Login and get session cookie."""
    print(f"Logging in as {username}...")
    response = requests.post(
        f"{BASE_URL}/login",
        data={"username": username, "password": password},
        allow_redirects=False
    )
    
    if response.status_code in [200, 302]:
        print("✓ Login successful")
        return response.cookies
    else:
        print(f"✗ Login failed: {response.status_code}")
        print(response.text)
        return None


def test_create_parser_task(cookies, file_path, tool_type="lite"):
    """Test creating a parser task."""
    print(f"\nTesting POST /api/files/parser/create...")
    print(f"File: {file_path}")
    print(f"Tool type: {tool_type}")
    
    if not os.path.exists(file_path):
        print(f"✗ Test file not found: {file_path}")
        return None
    
    with open(file_path, 'rb') as f:
        files = {'file': (os.path.basename(file_path), f)}
        data = {'tool_type': tool_type}
        
        response = requests.post(
            f"{API_BASE}/files/parser/create",
            files=files,
            data=data,
            cookies=cookies
        )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("✓ Parser task created successfully")
        print(f"Task ID: {result.get('data', {}).get('task_id')}")
        print(f"Status: {result.get('data', {}).get('status')}")
        print(f"Filename: {result.get('data', {}).get('filename')}")
        return result.get('data', {}).get('task_id')
    else:
        print(f"✗ Failed to create parser task")
        print(response.text)
        return None


def test_get_parser_result(cookies, task_id, poll=True, timeout=60):
    """Test getting parser result."""
    print(f"\nTesting GET /api/files/parser/result/{task_id}...")
    print(f"Poll: {poll}, Timeout: {timeout}s")
    
    params = {
        'format_type': 'text',
        'poll': 'true' if poll else 'false',
        'timeout': timeout
    }
    
    start_time = time.time()
    response = requests.get(
        f"{API_BASE}/files/parser/result/{task_id}",
        params=params,
        cookies=cookies
    )
    elapsed = time.time() - start_time
    
    print(f"Status: {response.status_code}")
    print(f"Elapsed time: {elapsed:.2f}s")
    
    if response.status_code == 200:
        result = response.json()
        data = result.get('data', {})
        status = data.get('status')
        
        print(f"✓ Got parser result")
        print(f"Status: {status}")
        
        if status == 'succeeded':
            content = data.get('content', '')
            print(f"Content length: {len(content)} characters")
            print(f"Content preview: {content[:200]}...")
        elif status == 'failed':
            print(f"Error: {data.get('error')}")
        elif status == 'processing':
            print("Still processing...")
        
        return data
    else:
        print(f"✗ Failed to get parser result")
        print(response.text)
        return None


def test_file_validation(cookies):
    """Test file validation (unsupported format, size limit, etc.)."""
    print(f"\nTesting file validation...")
    
    # Test 1: Missing file
    print("\n1. Testing missing file...")
    response = requests.post(
        f"{API_BASE}/files/parser/create",
        data={'tool_type': 'lite'},
        cookies=cookies
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 400:
        print("✓ Correctly rejected missing file")
    else:
        print("✗ Should have rejected missing file")
    
    # Test 2: Invalid tool_type
    print("\n2. Testing invalid tool_type...")
    if os.path.exists(TEST_FILE_PATH):
        with open(TEST_FILE_PATH, 'rb') as f:
            files = {'file': (os.path.basename(TEST_FILE_PATH), f)}
            data = {'tool_type': 'invalid'}
            
            response = requests.post(
                f"{API_BASE}/files/parser/create",
                files=files,
                data=data,
                cookies=cookies
            )
        
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            print("✓ Correctly rejected invalid tool_type")
        else:
            print("✗ Should have rejected invalid tool_type")


def main():
    """Run all tests."""
    print("=" * 60)
    print("File Parser API Test Suite")
    print("=" * 60)
    
    # Check if test file exists
    if not os.path.exists(TEST_FILE_PATH):
        print(f"\n⚠ Test file not found: {TEST_FILE_PATH}")
        print("Please create a test file or update TEST_FILE_PATH in the script.")
        print("\nYou can create a simple test file with:")
        print(f"  echo 'Test content' > {TEST_FILE_PATH}")
        return
    
    # Login
    cookies = login(USERNAME, PASSWORD)
    if not cookies:
        print("\n✗ Cannot proceed without login")
        return
    
    # Test creating parser task
    task_id = test_create_parser_task(cookies, TEST_FILE_PATH, tool_type="lite")
    
    if task_id:
        # Test getting parser result
        result = test_get_parser_result(cookies, task_id, poll=True, timeout=60)
    
    # Test file validation
    test_file_validation(cookies)
    
    print("\n" + "=" * 60)
    print("Test suite completed")
    print("=" * 60)


if __name__ == "__main__":
    main()
