#!/usr/bin/env python3

import requests
import sys
import json
import time

def test_daily_co_integration():
    """Test Daily.co API integration endpoints"""
    
    # Get backend URL from frontend .env
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    base_url = line.split('=', 1)[1].strip()
                    break
        api_url = f"{base_url}/api"
    except:
        api_url = "http://localhost:8001/api"
    
    print(f"🚀 Testing Daily.co API Integration at: {api_url}")
    print("=" * 60)
    
    # Test data as specified in review request
    room_name = "test-live-shopping"
    admin_user = "Test Admin"
    customer_user = "Test Customer"
    
    tests_passed = 0
    tests_total = 6
    
    # Test 1: Daily.co Service Configuration
    print("\n📹 Test 1: Daily.co Service Configuration")
    try:
        response = requests.get(f"{api_url}/daily/config", timeout=10)
        if response.status_code == 200:
            config_data = response.json()
            print(f"✅ PASSED - Status: {response.status_code}, Config keys: {list(config_data.keys())}")
            tests_passed += 1
        else:
            print(f"❌ FAILED - Status: {response.status_code}")
    except Exception as e:
        print(f"❌ FAILED - Error: {str(e)}")
    
    # Test 2: Room Creation
    print("\n📹 Test 2: Room Creation")
    try:
        room_request = {
            "room_name": room_name,
            "privacy": "public",
            "max_participants": 100,
            "properties": {
                "enable_screenshare": True,
                "enable_chat": True,
                "lang": "de"
            }
        }
        
        response = requests.post(
            f"{api_url}/daily/rooms",
            json=room_request,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        if response.status_code == 200:
            room_data = response.json()
            print(f"✅ PASSED - Room created: {room_data.get('name')}, URL: {room_data.get('url')}")
            tests_passed += 1
        else:
            print(f"❌ FAILED - Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"❌ FAILED - Error: {str(e)}")
    
    # Test 3: Admin Token Generation
    print("\n📹 Test 3: Admin Token Generation")
    try:
        admin_token_request = {
            "room_name": room_name,
            "user_name": admin_user,
            "is_owner": True,
            "enable_screenshare": True,
            "enable_recording": False,
            "enable_live_streaming": True
        }
        
        response = requests.post(
            f"{api_url}/daily/meeting-tokens",
            json=admin_token_request,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        if response.status_code == 200:
            token_data = response.json()
            token_length = len(token_data.get('token', ''))
            print(f"✅ PASSED - Admin token generated, length: {token_length}, is_owner: {token_data.get('is_owner')}")
            tests_passed += 1
        else:
            print(f"❌ FAILED - Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"❌ FAILED - Error: {str(e)}")
    
    # Test 4: Customer/Viewer Token Generation
    print("\n📹 Test 4: Customer/Viewer Token Generation")
    try:
        viewer_token_request = {
            "room_name": room_name,
            "user_name": customer_user,
            "is_owner": False,
            "enable_screenshare": False,
            "enable_recording": False,
            "enable_live_streaming": False
        }
        
        response = requests.post(
            f"{api_url}/daily/meeting-tokens",
            json=viewer_token_request,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        if response.status_code == 200:
            token_data = response.json()
            token_length = len(token_data.get('token', ''))
            print(f"✅ PASSED - Viewer token generated, length: {token_length}, is_owner: {token_data.get('is_owner')}")
            tests_passed += 1
        else:
            print(f"❌ FAILED - Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"❌ FAILED - Error: {str(e)}")
    
    # Test 5: Room Information Retrieval
    print("\n📹 Test 5: Room Information Retrieval")
    try:
        response = requests.get(f"{api_url}/daily/rooms/{room_name}", timeout=10)
        if response.status_code == 200:
            room_info = response.json()
            print(f"✅ PASSED - Room info retrieved: {room_info.get('id', 'N/A')}")
            tests_passed += 1
        else:
            print(f"❌ FAILED - Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"❌ FAILED - Error: {str(e)}")
    
    # Test 6: List All Rooms
    print("\n📹 Test 6: List All Rooms")
    try:
        response = requests.get(f"{api_url}/daily/rooms", timeout=10)
        if response.status_code == 200:
            rooms_data = response.json()
            rooms_list = rooms_data.get('data', [])
            print(f"✅ PASSED - Rooms listed: {len(rooms_list)} rooms found")
            tests_passed += 1
        else:
            print(f"❌ FAILED - Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"❌ FAILED - Error: {str(e)}")
    
    # Clean up - try to delete the test room
    print("\n🧹 Cleanup: Deleting test room")
    try:
        delete_response = requests.delete(f"{api_url}/daily/rooms/{room_name}", timeout=10)
        if delete_response.status_code == 200:
            print(f"✅ Test room '{room_name}' cleaned up successfully")
        else:
            print(f"⚠️ Could not clean up test room (Status: {delete_response.status_code})")
    except Exception as e:
        print(f"⚠️ Room cleanup failed: {str(e)}")
    
    # Final results
    print("\n" + "=" * 60)
    print(f"📊 DAILY.CO API INTEGRATION TEST RESULTS")
    print(f"Tests Passed: {tests_passed}/{tests_total}")
    print(f"Success Rate: {(tests_passed/tests_total)*100:.1f}%")
    
    if tests_passed == tests_total:
        print("🎉 ALL DAILY.CO TESTS PASSED!")
        return True
    else:
        print(f"⚠️ {tests_total - tests_passed} test(s) failed")
        return False

if __name__ == "__main__":
    success = test_daily_co_integration()
    sys.exit(0 if success else 1)