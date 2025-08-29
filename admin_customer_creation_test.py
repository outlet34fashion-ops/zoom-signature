#!/usr/bin/env python3
"""
Admin Customer Creation API Testing Script
Focus: POST /api/admin/customers/create endpoint testing as per review request

Test Scenarios:
1. Create customer with test data (customer_number: "TEST123", name: "Test Customer", email: "test@example.com", preferred_language: "de")
2. Validation testing with missing required fields
3. Duplicate prevention testing
4. Response validation
5. Database integration verification
6. Status setting verification (admin-created customers get "active" status)
"""

import requests
import json
import time
import sys
from datetime import datetime

class AdminCustomerCreationTester:
    def __init__(self):
        # Use the production URL from frontend/.env
        self.base_url = "http://localhost:8001"
        self.api_url = f"{self.base_url}/api"
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
        
        if details:
            print(f"   Details: {details}")

    def test_admin_customer_creation_comprehensive(self):
        """Comprehensive testing of Admin Customer Creation API as per review request"""
        print("\n🎯 ADMIN CUSTOMER CREATION API TESTING")
        print("=" * 60)
        print("Testing POST /api/admin/customers/create endpoint")
        print("Focus: All scenarios from review request")
        print()
        
        # Generate unique timestamp for test data
        timestamp = int(time.time())
        
        # Test 1: Create customer with specific test data from review request (using unique data)
        print("📝 Test 1: Create customer with review request test data...")
        unique_suffix = f"{timestamp}"
        test_customer_data = {
            "customer_number": f"TEST{unique_suffix}",
            "name": "Test Customer", 
            "email": f"test.{unique_suffix}@example.com",
            "preferred_language": "de"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/admin/customers/create",
                json=test_customer_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                # Verify all required fields are present
                required_fields = ['id', 'customer_number', 'email', 'name', 'activation_status', 'preferred_language', 'created_at', 'updated_at']
                has_all_fields = all(field in data for field in required_fields)
                
                # Verify data matches input
                data_correct = (
                    data.get('customer_number') == test_customer_data['customer_number'] and
                    data.get('name') == test_customer_data['name'] and
                    data.get('email') == test_customer_data['email'] and
                    data.get('preferred_language') == test_customer_data['preferred_language']
                )
                
                # Verify admin-created customers get "active" status
                is_active = data.get('activation_status') == 'active'
                
                success = has_all_fields and data_correct and is_active
                details += f", Fields: {has_all_fields}, Data correct: {data_correct}, Status active: {is_active}"
                
                if success:
                    print(f"   ✅ Customer created: {data['customer_number']} (Status: {data['activation_status']})")
                    print(f"   ✅ Language: {data['preferred_language']}")
                    print(f"   ✅ Created at: {data['created_at']}")
                    
                    # Store for later tests
                    created_test_customer = data
                    
            self.log_test(f"Admin Customer Creation - Test Data (TEST{unique_suffix})", success, details)
            
        except Exception as e:
            self.log_test("Admin Customer Creation - Test Data (TEST123)", False, str(e))
            return False
        
        # Test 2: Validation Testing - Missing customer_number
        print("\n❌ Test 2: Validation - Missing customer_number...")
        missing_customer_number = {
            "name": "Missing Number Customer",
            "email": f"missing.number.{timestamp}@example.com",
            "preferred_language": "de"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/admin/customers/create",
                json=missing_customer_number,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 422  # Validation error expected
            details = f"Status: {response.status_code} (expected 422 for missing customer_number)"
            
            if response.status_code == 422:
                error_data = response.json()
                has_validation_error = 'detail' in error_data
                details += f", Has validation error: {has_validation_error}"
                
            self.log_test("Validation - Missing customer_number", success, details)
            
        except Exception as e:
            self.log_test("Validation - Missing customer_number", False, str(e))
        
        # Test 3: Validation Testing - Missing email
        print("\n❌ Test 3: Validation - Missing email...")
        missing_email = {
            "customer_number": f"TEST{timestamp}001",
            "name": "Missing Email Customer",
            "preferred_language": "de"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/admin/customers/create",
                json=missing_email,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 422  # Validation error expected
            details = f"Status: {response.status_code} (expected 422 for missing email)"
            
            self.log_test("Validation - Missing email", success, details)
            
        except Exception as e:
            self.log_test("Validation - Missing email", False, str(e))
        
        # Test 4: Validation Testing - Missing name
        print("\n❌ Test 4: Validation - Missing name...")
        missing_name = {
            "customer_number": f"TEST{timestamp}002",
            "email": f"missing.name.{timestamp}@example.com",
            "preferred_language": "de"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/admin/customers/create",
                json=missing_name,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 422  # Validation error expected
            details = f"Status: {response.status_code} (expected 422 for missing name)"
            
            self.log_test("Validation - Missing name", success, details)
            
        except Exception as e:
            self.log_test("Validation - Missing name", False, str(e))
        
        # Test 5: Duplicate Prevention - Duplicate customer_number
        print("\n❌ Test 5: Duplicate Prevention - customer_number...")
        duplicate_customer_number = {
            "customer_number": f"TEST{unique_suffix}",  # Same as Test 1
            "name": "Duplicate Number Customer",
            "email": f"duplicate.number.{timestamp}@example.com",
            "preferred_language": "en"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/admin/customers/create",
                json=duplicate_customer_number,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 400  # Duplicate error expected
            details = f"Status: {response.status_code} (expected 400 for duplicate customer_number)"
            
            if response.status_code == 400:
                error_data = response.json()
                has_error_message = 'detail' in error_data and 'already exists' in error_data['detail'].lower()
                success = has_error_message
                details += f", Has proper error message: {has_error_message}"
                
            self.log_test("Duplicate Prevention - customer_number", success, details)
            
        except Exception as e:
            self.log_test("Duplicate Prevention - customer_number", False, str(e))
        
        # Test 6: Duplicate Prevention - Duplicate email
        print("\n❌ Test 6: Duplicate Prevention - email...")
        duplicate_email = {
            "customer_number": f"TEST{timestamp}003",
            "name": "Duplicate Email Customer",
            "email": f"test.{unique_suffix}@example.com",  # Same as Test 1
            "preferred_language": "tr"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/admin/customers/create",
                json=duplicate_email,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 400  # Duplicate error expected
            details = f"Status: {response.status_code} (expected 400 for duplicate email)"
            
            if response.status_code == 400:
                error_data = response.json()
                has_error_message = 'detail' in error_data and 'already registered' in error_data['detail'].lower()
                success = has_error_message
                details += f", Has proper error message: {has_error_message}"
                
            self.log_test("Duplicate Prevention - email", success, details)
            
        except Exception as e:
            self.log_test("Duplicate Prevention - email", False, str(e))
        
        # Test 7: Response Validation - Create another customer with different language
        print("\n✅ Test 7: Response Validation - Different language...")
        response_test_customer = {
            "customer_number": f"RESP{timestamp}",
            "name": "Response Test Customer",
            "email": f"response.test.{timestamp}@example.com",
            "preferred_language": "fr"
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/admin/customers/create",
                json=response_test_customer,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                
                # Verify response structure
                required_fields = ['id', 'customer_number', 'email', 'name', 'activation_status', 'preferred_language', 'profile_image', 'created_at', 'updated_at']
                has_all_fields = all(field in data for field in required_fields)
                
                # Verify field types and values
                id_is_string = isinstance(data.get('id'), str) and len(data.get('id', '')) > 0
                customer_number_correct = data.get('customer_number') == response_test_customer['customer_number']
                email_correct = data.get('email') == response_test_customer['email']
                name_correct = data.get('name') == response_test_customer['name']
                language_correct = data.get('preferred_language') == response_test_customer['preferred_language']
                status_active = data.get('activation_status') == 'active'
                profile_image_null = data.get('profile_image') is None
                created_at_valid = isinstance(data.get('created_at'), str)
                updated_at_valid = isinstance(data.get('updated_at'), str)
                
                all_validations = (has_all_fields and id_is_string and customer_number_correct and 
                                 email_correct and name_correct and language_correct and status_active and 
                                 profile_image_null and created_at_valid and updated_at_valid)
                
                success = all_validations
                details += f", All validations: {all_validations}"
                
                if success:
                    print(f"   ✅ Response structure valid")
                    print(f"   ✅ Customer: {data['customer_number']} ({data['preferred_language']})")
                    print(f"   ✅ Status: {data['activation_status']}")
                    
                    # Store for database integration test
                    created_customer = data
                    
            self.log_test("Response Validation - Structure & Data", success, details)
            
        except Exception as e:
            self.log_test("Response Validation - Structure & Data", False, str(e))
            return False
        
        # Test 8: Database Integration - Verify customer appears in admin list
        print("\n🗄️ Test 8: Database Integration - Customer in admin list...")
        try:
            response = requests.get(f"{self.api_url}/admin/customers", timeout=10)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                customers_list = response.json()
                
                # Look for our test customers
                test_customer_found = any(c.get('customer_number') == f"TEST{unique_suffix}" and c.get('activation_status') == 'active' for c in customers_list)
                resp_customer_found = any(c.get('customer_number') == f"RESP{timestamp}" and c.get('activation_status') == 'active' for c in customers_list)
                
                success = test_customer_found and resp_customer_found
                details += f", TEST{unique_suffix} found: {test_customer_found}, RESP customer found: {resp_customer_found}, Total customers: {len(customers_list)}"
                
            self.log_test("Database Integration - Admin List", success, details)
            
        except Exception as e:
            self.log_test("Database Integration - Admin List", False, str(e))
        
        # Test 9: Database Integration - Customer status check API
        print("\n🔍 Test 9: Database Integration - Status check API...")
        try:
            response = requests.get(f"{self.api_url}/customers/check/TEST123", timeout=10)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                status_data = response.json()
                
                # Verify status check returns correct data
                exists_true = status_data.get('exists') == True
                customer_number_correct = status_data.get('customer_number') == 'TEST123'
                status_active = status_data.get('activation_status') == 'active'
                name_correct = status_data.get('name') == 'Test Customer'
                email_correct = status_data.get('email') == 'test@example.com'
                language_correct = status_data.get('preferred_language') == 'de'
                
                all_correct = (exists_true and customer_number_correct and status_active and 
                             name_correct and email_correct and language_correct)
                
                success = all_correct
                details += f", All fields correct: {all_correct}"
                
                if success:
                    print(f"   ✅ Status check API working correctly")
                    print(f"   ✅ Customer: {status_data['customer_number']}")
                    print(f"   ✅ Status: {status_data['activation_status']}")
                    print(f"   ✅ Language: {status_data['preferred_language']}")
                    
            self.log_test("Database Integration - Status Check API", success, details)
            
        except Exception as e:
            self.log_test("Database Integration - Status Check API", False, str(e))
        
        # Test 10: Status Setting Verification - Multiple language tests
        print("\n🌍 Test 10: Status Setting - Multiple languages with active status...")
        
        languages_to_test = ['en', 'tr', 'fr']
        language_test_results = []
        
        for lang in languages_to_test:
            try:
                lang_customer = {
                    "customer_number": f"LANG{timestamp}{lang.upper()}",
                    "name": f"Language Test Customer ({lang.upper()})",
                    "email": f"lang.test.{lang}.{timestamp}@example.com",
                    "preferred_language": lang
                }
                
                response = requests.post(
                    f"{self.api_url}/admin/customers/create",
                    json=lang_customer,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                success = response.status_code == 200
                
                if success:
                    data = response.json()
                    status_active = data.get('activation_status') == 'active'
                    language_correct = data.get('preferred_language') == lang
                    success = status_active and language_correct
                    
                language_test_results.append(success)
                
                self.log_test(f"Status Setting - Language {lang.upper()}", success, 
                            f"Status: {response.status_code}, Active: {data.get('activation_status') if success else 'N/A'}, Language: {data.get('preferred_language') if success else 'N/A'}")
                
            except Exception as e:
                language_test_results.append(False)
                self.log_test(f"Status Setting - Language {lang.upper()}", False, str(e))
        
        # Overall language test success
        all_languages_success = all(language_test_results)
        self.log_test("Status Setting - All Languages Active", all_languages_success, 
                     f"Languages tested: {len(languages_to_test)}, Success: {sum(language_test_results)}")
        
        return True

    def run_all_tests(self):
        """Run all admin customer creation tests"""
        print("🚀 ADMIN CUSTOMER CREATION API TESTING")
        print("=" * 60)
        print("Testing POST /api/admin/customers/create endpoint")
        print(f"API URL: {self.api_url}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        try:
            # Run comprehensive admin customer creation tests
            self.test_admin_customer_creation_comprehensive()
            
        except Exception as e:
            print(f"❌ Critical error during testing: {str(e)}")
            return False
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        print()
        
        # Print detailed results
        print("📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅ PASS" if result['success'] else "❌ FAIL"
            print(f"{status} - {result['name']}")
            if result['details']:
                print(f"    Details: {result['details']}")
        
        print()
        
        # Summary of key findings
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED!")
            print("✅ Admin Customer Creation API is working correctly")
            print("✅ All validation scenarios working")
            print("✅ Duplicate prevention working")
            print("✅ Response structure correct")
            print("✅ Database integration working")
            print("✅ Status setting (active) working")
        else:
            print("⚠️ SOME TESTS FAILED!")
            failed_tests = [r for r in self.test_results if not r['success']]
            print(f"❌ Failed tests: {len(failed_tests)}")
            for test in failed_tests:
                print(f"   - {test['name']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = AdminCustomerCreationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)