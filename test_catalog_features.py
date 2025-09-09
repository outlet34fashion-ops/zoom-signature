#!/usr/bin/env python3

import requests
import sys
import json
import os
import time
from datetime import datetime, timezone, timedelta

class CatalogFeaturesAPITester:
    def __init__(self, base_url=None):
        # Use the backend URL from frontend .env if not specified
        if base_url is None:
            try:
                with open('/app/frontend/.env', 'r') as f:
                    for line in f:
                        if line.startswith('REACT_APP_BACKEND_URL='):
                            base_url = line.split('=', 1)[1].strip()
                            break
                if base_url is None:
                    base_url = "http://localhost:8001"
            except:
                base_url = "http://localhost:8001"
        
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

    def test_new_catalog_features(self):
        """Test the new catalog features implementation as per review request"""
        print("\n🛍️ Testing NEW CATALOG FEATURES IMPLEMENTATION...")
        print("  🎯 TESTING REQUIREMENTS FROM REVIEW REQUEST:")
        print("    1. Enhanced Product Model with material and colors fields")
        print("    2. Favorites System (add, remove, get, check)")
        print("    3. Recently Viewed System (add, get with limit)")
        print("    4. Enhanced Search (name, description, material, article_number)")
        print("    5. Database Collections (favorites, recently_viewed)")
        
        # Test customer for favorites and recently viewed
        test_customer = "10299"
        
        # Step 1: Test Enhanced Product Model
        print("  📦 STEP 1: Testing Enhanced Product Model...")
        
        # First, get existing categories to use for product creation
        try:
            categories_response = requests.get(f"{self.api_url}/categories", timeout=10)
            if categories_response.status_code == 200:
                categories = categories_response.json()
                if categories:
                    category_id = categories[0]['id']
                    print(f"    Using existing category: {categories[0]['name']} (ID: {category_id})")
                else:
                    # Create a test category if none exist
                    test_category = {
                        "name": "Test Category",
                        "description": "Test category for catalog features",
                        "sort_order": 1
                    }
                    cat_response = requests.post(
                        f"{self.api_url}/admin/categories",
                        json=test_category,
                        headers={'Content-Type': 'application/json'},
                        timeout=10
                    )
                    if cat_response.status_code == 200:
                        category_id = cat_response.json()['id']
                        print(f"    Created test category: {category_id}")
                    else:
                        self.log_test("Enhanced Product Model - Category Setup", False, f"Could not create test category: {cat_response.status_code}")
                        return False
            else:
                self.log_test("Enhanced Product Model - Category Fetch", False, f"Categories fetch failed: {categories_response.status_code}")
                return False
        except Exception as e:
            self.log_test("Enhanced Product Model - Category Setup", False, str(e))
            return False
        
        # Test product creation with material and colors fields
        enhanced_product = {
            "name": "Enhanced Test Product",
            "description": "Test product with material and colors",
            "material": "Baumwolle",  # Cotton in German
            "category_id": category_id,
            "price": 29.99,
            "sizes": ["S", "M", "L"],
            "colors": ["Schwarz", "Weiß"],  # Black, White in German
            "is_active": True
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/admin/products",
                json=enhanced_product,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"POST Status: {response.status_code}"
            
            if success:
                product_data = response.json()
                required_fields = ['id', 'name', 'material', 'colors', 'article_number']
                has_all_fields = all(field in product_data for field in required_fields)
                material_correct = product_data.get('material') == "Baumwolle"
                colors_correct = product_data.get('colors') == ["Schwarz", "Weiß"]
                has_article_number = product_data.get('article_number') is not None
                
                success = has_all_fields and material_correct and colors_correct and has_article_number
                details += f", Has all fields: {has_all_fields}, Material: {material_correct}, Colors: {colors_correct}, Article number: {has_article_number}"
                
                if success:
                    test_product_id = product_data['id']
                    test_article_number = product_data['article_number']
                    print(f"    Created product: {product_data['name']} (ID: {test_product_id}, Article: {test_article_number})")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Enhanced Product Model - Creation with Material & Colors", success, details)
            
            if not success:
                return False
                
        except Exception as e:
            self.log_test("Enhanced Product Model - Creation", False, str(e))
            return False
        
        # Test optional article_number generation
        try:
            product_without_article = {
                "name": "Auto Article Number Product",
                "description": "Test automatic article number generation",
                "material": "Polyester",
                "category_id": category_id,
                "price": 19.99,
                "sizes": ["OneSize"],
                "colors": ["Blau"],
                "is_active": True
            }
            
            response = requests.post(
                f"{self.api_url}/admin/products",
                json=product_without_article,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"POST Status: {response.status_code}"
            
            if success:
                product_data = response.json()
                has_auto_article = product_data.get('article_number') is not None and product_data.get('article_number') != ""
                success = has_auto_article
                details += f", Auto article number generated: {has_auto_article}, Article: {product_data.get('article_number')}"
                print(f"    Auto-generated article number: {product_data.get('article_number')}")
            
            self.log_test("Enhanced Product Model - Auto Article Number Generation", success, details)
            
        except Exception as e:
            self.log_test("Enhanced Product Model - Auto Article Number", False, str(e))
        
        # Step 2: Test Favorites System
        print("  ❤️ STEP 2: Testing Favorites System...")
        
        # Test ADD favorite
        try:
            response = requests.post(
                f"{self.api_url}/favorites/{test_customer}/{test_product_id}",
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"POST Status: {response.status_code}"
            
            if success:
                data = response.json()
                success = data.get('success') == True
                details += f", Success: {data.get('success')}, Message: {data.get('message', '')}"
                print(f"    Added favorite: {data.get('message', '')}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Favorites System - Add Favorite", success, details)
            
        except Exception as e:
            self.log_test("Favorites System - Add Favorite", False, str(e))
        
        # Test CHECK if favorite
        try:
            response = requests.get(
                f"{self.api_url}/favorites/check/{test_customer}/{test_product_id}",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            
            if success:
                data = response.json()
                is_favorite = data.get('is_favorite') == True
                success = is_favorite
                details += f", Is favorite: {is_favorite}"
                print(f"    Check favorite result: {is_favorite}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Favorites System - Check Favorite", success, details)
            
        except Exception as e:
            self.log_test("Favorites System - Check Favorite", False, str(e))
        
        # Test GET customer favorites
        try:
            response = requests.get(
                f"{self.api_url}/favorites/{test_customer}",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            
            if success:
                data = response.json()
                is_list = isinstance(data, list)
                has_favorite = len(data) > 0
                success = is_list and has_favorite
                details += f", Is list: {is_list}, Has favorites: {has_favorite}, Count: {len(data)}"
                print(f"    Customer favorites count: {len(data)}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Favorites System - Get Customer Favorites", success, details)
            
        except Exception as e:
            self.log_test("Favorites System - Get Favorites", False, str(e))
        
        # Test REMOVE favorite
        try:
            response = requests.delete(
                f"{self.api_url}/favorites/{test_customer}/{test_product_id}",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"DELETE Status: {response.status_code}"
            
            if success:
                data = response.json()
                success = data.get('success') == True
                details += f", Success: {data.get('success')}, Message: {data.get('message', '')}"
                print(f"    Removed favorite: {data.get('message', '')}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Favorites System - Remove Favorite", success, details)
            
        except Exception as e:
            self.log_test("Favorites System - Remove Favorite", False, str(e))
        
        # Step 3: Test Recently Viewed System
        print("  👁️ STEP 3: Testing Recently Viewed System...")
        
        # Test ADD to recently viewed
        try:
            response = requests.post(
                f"{self.api_url}/recently-viewed/{test_customer}/{test_product_id}",
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"POST Status: {response.status_code}"
            
            if success:
                data = response.json()
                success = data.get('success') == True
                details += f", Success: {data.get('success')}, Message: {data.get('message', '')}"
                print(f"    Added to recently viewed: {data.get('message', '')}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Recently Viewed System - Add Recently Viewed", success, details)
            
        except Exception as e:
            self.log_test("Recently Viewed System - Add Recently Viewed", False, str(e))
        
        # Test GET recently viewed with limit
        try:
            response = requests.get(
                f"{self.api_url}/recently-viewed/{test_customer}?limit=10",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            
            if success:
                data = response.json()
                is_list = isinstance(data, list)
                has_items = len(data) > 0
                within_limit = len(data) <= 10
                success = is_list and has_items and within_limit
                details += f", Is list: {is_list}, Has items: {has_items}, Within limit: {within_limit}, Count: {len(data)}"
                print(f"    Recently viewed count: {len(data)}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Recently Viewed System - Get Recently Viewed", success, details)
            
        except Exception as e:
            self.log_test("Recently Viewed System - Get Recently Viewed", False, str(e))
        
        # Step 4: Test Enhanced Search
        print("  🔍 STEP 4: Testing Enhanced Search...")
        
        # Test search by material
        try:
            response = requests.get(
                f"{self.api_url}/products?search=Baumwolle",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            
            if success:
                data = response.json()
                is_list = isinstance(data, list)
                found_material_product = any(
                    product.get('material', '').lower() == 'baumwolle' 
                    for product in data
                )
                success = is_list and found_material_product
                details += f", Is list: {is_list}, Found material product: {found_material_product}, Results: {len(data)}"
                print(f"    Search by material 'Baumwolle': {len(data)} results, Found match: {found_material_product}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Enhanced Search - Search by Material", success, details)
            
        except Exception as e:
            self.log_test("Enhanced Search - Search by Material", False, str(e))
        
        # Test search by article number
        try:
            response = requests.get(
                f"{self.api_url}/products?search={test_article_number}",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            
            if success:
                data = response.json()
                is_list = isinstance(data, list)
                found_article_product = any(
                    product.get('article_number') == test_article_number
                    for product in data
                )
                success = is_list and found_article_product
                details += f", Is list: {is_list}, Found article product: {found_article_product}, Results: {len(data)}"
                print(f"    Search by article '{test_article_number}': {len(data)} results, Found match: {found_article_product}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Enhanced Search - Search by Article Number", success, details)
            
        except Exception as e:
            self.log_test("Enhanced Search - Search by Article Number", False, str(e))
        
        # Test search with category filtering
        try:
            response = requests.get(
                f"{self.api_url}/products?search=Enhanced&category_id={category_id}",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            
            if success:
                data = response.json()
                is_list = isinstance(data, list)
                all_in_category = all(
                    product.get('category_id') == category_id
                    for product in data
                ) if data else True  # Empty results are OK
                success = is_list and all_in_category
                details += f", Is list: {is_list}, All in category: {all_in_category}, Results: {len(data)}"
                print(f"    Search with category filter: {len(data)} results, All in category: {all_in_category}")
            else:
                print(f"    Response: {response.text}")
            
            self.log_test("Enhanced Search - Search with Category Filter", success, details)
            
        except Exception as e:
            self.log_test("Enhanced Search - Category Filter", False, str(e))
        
        # Step 5: Test Database Collections
        print("  🗄️ STEP 5: Testing Database Collections...")
        
        # Test that favorites collection exists and works
        try:
            # Add a favorite to test collection
            requests.post(
                f"{self.api_url}/favorites/{test_customer}/{test_product_id}",
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            # Get favorites to verify collection works
            response = requests.get(
                f"{self.api_url}/favorites/{test_customer}",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Favorites collection test - Status: {response.status_code}"
            
            if success:
                data = response.json()
                collection_works = isinstance(data, list)
                success = collection_works
                details += f", Collection works: {collection_works}"
                print(f"    Favorites collection working: {collection_works}")
            
            self.log_test("Database Collections - Favorites Collection", success, details)
            
        except Exception as e:
            self.log_test("Database Collections - Favorites Collection", False, str(e))
        
        # Test that recently_viewed collection exists and works
        try:
            # Add to recently viewed to test collection
            requests.post(
                f"{self.api_url}/recently-viewed/{test_customer}/{test_product_id}",
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            # Get recently viewed to verify collection works
            response = requests.get(
                f"{self.api_url}/recently-viewed/{test_customer}",
                timeout=10
            )
            
            success = response.status_code == 200
            details = f"Recently viewed collection test - Status: {response.status_code}"
            
            if success:
                data = response.json()
                collection_works = isinstance(data, list)
                success = collection_works
                details += f", Collection works: {collection_works}"
                print(f"    Recently viewed collection working: {collection_works}")
            
            self.log_test("Database Collections - Recently Viewed Collection", success, details)
            
        except Exception as e:
            self.log_test("Database Collections - Recently Viewed Collection", False, str(e))
        
        print("  📊 NEW CATALOG FEATURES TESTING COMPLETED!")
        
        # Count catalog feature tests
        catalog_tests = [r for r in self.test_results if any(keyword in r['name'] for keyword in ['Enhanced Product', 'Favorites System', 'Recently Viewed', 'Enhanced Search', 'Database Collections'])]
        catalog_success_count = sum(1 for test in catalog_tests if test['success'])
        
        print(f"  🎯 Catalog Features Tests: {catalog_success_count}/{len(catalog_tests)} passed ({(catalog_success_count/len(catalog_tests))*100:.1f}%)")
        
        return catalog_success_count == len(catalog_tests)

    def run_tests(self):
        """Run the catalog features tests"""
        print(f"🚀 Starting NEW CATALOG FEATURES Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print(f"🔗 API URL: {self.api_url}")
        print("=" * 80)
        
        # Run the new catalog features test
        catalog_success = self.test_new_catalog_features()
        
        # Print final results
        print("\n" + "=" * 80)
        print(f"🏁 NEW CATALOG FEATURES TESTING COMPLETED")
        print(f"📊 Results: {self.tests_passed}/{self.tests_run} tests passed ({(self.tests_passed/self.tests_run)*100:.1f}%)")
        
        if catalog_success:
            print("🎉 ALL NEW CATALOG FEATURES TESTS PASSED! Backend API is working correctly.")
        else:
            print("⚠️  Some catalog features tests failed. Check the details above.")
            failed_tests = [test for test in self.test_results if not test['success']]
            print(f"❌ Failed tests: {len(failed_tests)}")
            for test in failed_tests:
                print(f"   - {test['name']}: {test['details']}")
        
        print("=" * 80)
        return catalog_success

if __name__ == "__main__":
    tester = CatalogFeaturesAPITester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)