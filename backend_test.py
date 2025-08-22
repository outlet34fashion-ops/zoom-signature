import requests
import sys
import json
from datetime import datetime
import time

class LiveShoppingAPITester:
    def __init__(self, base_url="https://shop-stream-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
        })

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("API Root", success, details)
            return success
        except Exception as e:
            self.log_test("API Root", False, str(e))
            return False

    def test_stream_status(self):
        """Test stream status endpoint"""
        try:
            response = requests.get(f"{self.api_url}/stream/status", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                required_fields = ['is_live', 'viewer_count', 'stream_title', 'stream_description']
                has_all_fields = all(field in data for field in required_fields)
                success = has_all_fields
                details += f", Has all fields: {has_all_fields}, Data: {data}"
            self.log_test("Stream Status", success, details)
            return success, response.json() if success else {}
        except Exception as e:
            self.log_test("Stream Status", False, str(e))
            return False, {}

    def test_get_products(self):
        """Test get products endpoint"""
        try:
            response = requests.get(f"{self.api_url}/products", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                success = isinstance(data, list) and len(data) > 0
                if success:
                    # Check first product structure
                    product = data[0]
                    required_fields = ['id', 'name', 'price', 'sizes']
                    has_all_fields = all(field in product for field in required_fields)
                    success = has_all_fields
                    details += f", Products count: {len(data)}, First product valid: {has_all_fields}"
                else:
                    details += ", No products returned"
            self.log_test("Get Products", success, details)
            return success, response.json() if success else []
        except Exception as e:
            self.log_test("Get Products", False, str(e))
            return False, []

    def test_chat_endpoints(self):
        """Test chat endpoints - get and post"""
        # Test GET chat messages
        try:
            response = requests.get(f"{self.api_url}/chat", timeout=10)
            get_success = response.status_code == 200
            get_details = f"GET Status: {response.status_code}"
            if get_success:
                data = response.json()
                get_success = isinstance(data, list)
                get_details += f", Messages count: {len(data)}"
            self.log_test("Get Chat Messages", get_success, get_details)
        except Exception as e:
            self.log_test("Get Chat Messages", False, str(e))
            get_success = False

        # Test POST chat message
        try:
            test_message = {
                "username": f"test_user_{int(time.time())}",
                "message": "Test message from backend test",
                "emoji": "🧪"
            }
            response = requests.post(
                f"{self.api_url}/chat", 
                json=test_message,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            post_success = response.status_code == 200
            post_details = f"POST Status: {response.status_code}"
            if post_success:
                data = response.json()
                required_fields = ['id', 'username', 'message', 'timestamp']
                has_all_fields = all(field in data for field in required_fields)
                post_success = has_all_fields
                post_details += f", Response valid: {has_all_fields}"
            self.log_test("Post Chat Message", post_success, post_details)
            return get_success and post_success
        except Exception as e:
            self.log_test("Post Chat Message", False, str(e))
            return False

    def test_order_endpoints(self, products):
        """Test order endpoints"""
        if not products:
            self.log_test("Order Endpoints", False, "No products available for testing")
            return False

        # Test GET orders
        try:
            response = requests.get(f"{self.api_url}/orders", timeout=10)
            get_success = response.status_code == 200
            get_details = f"GET Status: {response.status_code}"
            if get_success:
                data = response.json()
                get_success = isinstance(data, list)
                get_details += f", Orders count: {len(data)}"
            self.log_test("Get Orders", get_success, get_details)
        except Exception as e:
            self.log_test("Get Orders", False, str(e))
            get_success = False

        # Test POST order
        try:
            product = products[0]
            test_order = {
                "customer_id": f"test_customer_{int(time.time())}",
                "product_id": product['id'],
                "size": product['sizes'][0] if product['sizes'] else "OneSize",
                "quantity": 2
            }
            response = requests.post(
                f"{self.api_url}/orders",
                json=test_order,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            post_success = response.status_code == 200
            post_details = f"POST Status: {response.status_code}"
            if post_success:
                data = response.json()
                required_fields = ['id', 'customer_id', 'product_id', 'size', 'quantity', 'price']
                has_all_fields = all(field in data for field in required_fields)
                post_success = has_all_fields
                post_details += f", Response valid: {has_all_fields}, Price: {data.get('price', 'N/A')}"
            self.log_test("Post Order", post_success, post_details)
            return get_success and post_success
        except Exception as e:
            self.log_test("Post Order", False, str(e))
            return False

    def test_websocket_availability(self):
        """Test if WebSocket endpoint is accessible (basic connectivity)"""
        try:
            # We can't easily test WebSocket functionality in a simple script,
            # but we can check if the endpoint responds to HTTP requests
            ws_url = self.base_url.replace('https://', 'http://') + '/ws'
            response = requests.get(ws_url, timeout=5)
            # WebSocket endpoints typically return 426 Upgrade Required for HTTP requests
            success = response.status_code in [426, 400, 405]  # Expected responses for WS endpoint
            details = f"Status: {response.status_code} (Expected 426/400/405 for WebSocket endpoint)"
            self.log_test("WebSocket Endpoint Availability", success, details)
            return success
        except Exception as e:
            self.log_test("WebSocket Endpoint Availability", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Live Shopping App Backend API Tests")
        print(f"🔗 Testing against: {self.base_url}")
        print("=" * 60)

        # Test API root
        if not self.test_api_root():
            print("❌ API root failed - stopping tests")
            return False

        # Test stream status
        stream_success, stream_data = self.test_stream_status()
        
        # Test products
        products_success, products = self.test_get_products()
        
        # Test chat endpoints
        chat_success = self.test_chat_endpoints()
        
        # Test order endpoints
        order_success = self.test_order_endpoints(products)
        
        # Test WebSocket availability
        ws_success = self.test_websocket_availability()

        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{status} - {result['name']}")
            if result['details']:
                print(f"    Details: {result['details']}")

        # Critical functionality check
        critical_tests = [
            ("API Root", any(r['name'] == 'API Root' and r['success'] for r in self.test_results)),
            ("Stream Status", stream_success),
            ("Products", products_success),
            ("Chat System", chat_success),
            ("Order System", order_success)
        ]
        
        print(f"\n🎯 CRITICAL FUNCTIONALITY:")
        all_critical_passed = True
        for test_name, passed in critical_tests:
            status = "✅" if passed else "❌"
            print(f"{status} {test_name}")
            if not passed:
                all_critical_passed = False

        if all_critical_passed:
            print(f"\n🎉 All critical backend functionality is working!")
        else:
            print(f"\n⚠️  Some critical backend functionality has issues!")

        return self.tests_passed == self.tests_run

def main():
    tester = LiveShoppingAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())