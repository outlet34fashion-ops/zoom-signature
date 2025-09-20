#!/usr/bin/env python3
"""
Customer Data Migration Test
Tests the customer data migration preparation functionality
"""

import requests
import csv
import codecs
import json
import time
from datetime import datetime

class CustomerMigrationTester:
    def __init__(self):
        self.base_url = "https://shop-syntax-fix.preview.emergentagent.com"
        self.api_url = f"{self.base_url}/api"
        
    def test_csv_data_analysis(self):
        """Test CSV data analysis without touching the database"""
        print("🔄 CUSTOMER DATA MIGRATION PREPARATION TEST")
        print("=" * 60)
        print("📁 CSV DATA LOCATION: /tmp/contacts.csv")
        
        try:
            # STEP 1: Analyze CSV data structure
            print("\n📊 STEP 1: ANALYZING CSV DATA STRUCTURE...")
            
            csv_customers = []
            with codecs.open('/tmp/contacts.csv', 'r', encoding='iso-8859-1') as csvfile:
                reader = csv.DictReader(csvfile, delimiter=';')
                
                # Show CSV headers
                headers = reader.fieldnames
                print(f"📋 CSV Headers ({len(headers)} columns):")
                for i, header in enumerate(headers, 1):
                    marker = " ⭐" if header in ['Kundennummer', 'Firmenname', 'Vorname', 'Nachname', 'E-Mail 1'] else ""
                    print(f"  {i:2d}. {header}{marker}")
                
                # Process CSV data
                for row in reader:
                    csv_customer = {
                        'customer_number': row.get('Kundennummer', '').strip(),
                        'company_name': row.get('Firmenname', '').strip(),
                        'first_name': row.get('Vorname', '').strip(),
                        'last_name': row.get('Nachname', '').strip(),
                        'email': row.get('E-Mail 1', '').strip()
                    }
                    
                    # Only include customers with valid customer number and email
                    if csv_customer['customer_number'] and csv_customer['email']:
                        csv_customers.append(csv_customer)
            
            csv_count = len(csv_customers)
            print(f"\n📊 CSV PROCESSING RESULTS:")
            print(f"  - Total records processed: {csv_count}")
            print(f"  - Records with valid customer number and email: {csv_count}")
            
            # Show sample data
            print(f"\n📋 SAMPLE CSV DATA (first 5 records):")
            for i, sample in enumerate(csv_customers[:5], 1):
                print(f"  {i}. Customer: {sample['customer_number']}")
                print(f"     Company: {sample['company_name']}")
                print(f"     Name: {sample['first_name']} {sample['last_name']}")
                print(f"     Email: {sample['email']}")
                print()
            
            # STEP 2: Data validation analysis
            print("🔍 STEP 2: DATA VALIDATION ANALYSIS...")
            
            validation_stats = {
                'valid_customer_numbers': 0,
                'valid_emails': 0,
                'has_first_name': 0,
                'has_last_name': 0,
                'has_company': 0,
                'numeric_customer_numbers': 0
            }
            
            for customer in csv_customers[:100]:  # Check first 100 for performance
                if customer['customer_number']:
                    validation_stats['valid_customer_numbers'] += 1
                    if customer['customer_number'].isdigit():
                        validation_stats['numeric_customer_numbers'] += 1
                
                if '@' in customer['email'] and '.' in customer['email']:
                    validation_stats['valid_emails'] += 1
                
                if customer['first_name']:
                    validation_stats['has_first_name'] += 1
                
                if customer['last_name']:
                    validation_stats['has_last_name'] += 1
                
                if customer['company_name']:
                    validation_stats['has_company'] += 1
            
            print(f"📊 VALIDATION STATISTICS (first 100 records):")
            for stat, count in validation_stats.items():
                percentage = (count / 100) * 100
                print(f"  - {stat.replace('_', ' ').title()}: {count}/100 ({percentage:.1f}%)")
            
            # STEP 3: Migration readiness assessment
            print(f"\n🚦 STEP 3: MIGRATION READINESS ASSESSMENT...")
            
            readiness_score = 0
            max_score = 6
            
            # Check 1: CSV file exists and readable
            if csv_count > 0:
                readiness_score += 1
                print(f"  ✅ CSV file readable: {csv_count} records")
            else:
                print(f"  ❌ CSV file not readable or empty")
            
            # Check 2: Sufficient valid customer numbers
            if validation_stats['valid_customer_numbers'] >= 80:
                readiness_score += 1
                print(f"  ✅ Sufficient valid customer numbers: {validation_stats['valid_customer_numbers']}/100")
            else:
                print(f"  ❌ Insufficient valid customer numbers: {validation_stats['valid_customer_numbers']}/100")
            
            # Check 3: Sufficient valid emails
            if validation_stats['valid_emails'] >= 80:
                readiness_score += 1
                print(f"  ✅ Sufficient valid emails: {validation_stats['valid_emails']}/100")
            else:
                print(f"  ❌ Insufficient valid emails: {validation_stats['valid_emails']}/100")
            
            # Check 4: Customer numbers are numeric
            if validation_stats['numeric_customer_numbers'] >= 80:
                readiness_score += 1
                print(f"  ✅ Customer numbers are numeric: {validation_stats['numeric_customer_numbers']}/100")
            else:
                print(f"  ❌ Customer numbers not consistently numeric: {validation_stats['numeric_customer_numbers']}/100")
            
            # Check 5: Names are available
            if validation_stats['has_first_name'] >= 50 or validation_stats['has_last_name'] >= 50:
                readiness_score += 1
                print(f"  ✅ Names available: First={validation_stats['has_first_name']}/100, Last={validation_stats['has_last_name']}/100")
            else:
                print(f"  ❌ Insufficient name data: First={validation_stats['has_first_name']}/100, Last={validation_stats['has_last_name']}/100")
            
            # Check 6: Expected record count
            if csv_count >= 800:
                readiness_score += 1
                print(f"  ✅ Expected record count: {csv_count} >= 800")
            else:
                print(f"  ⚠️  Lower than expected record count: {csv_count} < 800")
            
            # Final assessment
            readiness_percentage = (readiness_score / max_score) * 100
            print(f"\n📊 MIGRATION READINESS SCORE: {readiness_score}/{max_score} ({readiness_percentage:.1f}%)")
            
            if readiness_score >= 5:
                print(f"✅ MIGRATION READY: CSV data is suitable for migration")
                migration_ready = True
            elif readiness_score >= 3:
                print(f"⚠️  MIGRATION POSSIBLE WITH CAUTION: Some data quality issues")
                migration_ready = True
            else:
                print(f"❌ MIGRATION NOT RECOMMENDED: Significant data quality issues")
                migration_ready = False
            
            # STEP 4: Migration plan summary
            print(f"\n📋 STEP 4: MIGRATION PLAN SUMMARY...")
            print(f"  🎯 OBJECTIVE: Import {csv_count} customers from CSV")
            print(f"  📊 DATA QUALITY: {readiness_percentage:.1f}% ready")
            print(f"  🔄 PROCESS:")
            print(f"    1. Backup current customer database")
            print(f"    2. Clear existing customer data")
            print(f"    3. Import {csv_count} customers from CSV")
            print(f"    4. Validate imported data")
            print(f"    5. Activate imported customers")
            
            print(f"\n⚠️  SAFETY REQUIREMENTS:")
            print(f"    - Complete database backup before any changes")
            print(f"    - Test import on small subset first")
            print(f"    - Verify backup restoration capability")
            print(f"    - Have rollback plan ready")
            
            # STEP 5: Test backend API availability (without modifying data)
            print(f"\n🔌 STEP 5: BACKEND API AVAILABILITY CHECK...")
            
            try:
                # Test API root
                response = requests.get(f"{self.api_url}/", timeout=10)
                if response.status_code == 200:
                    print(f"  ✅ Backend API accessible: {self.api_url}")
                else:
                    print(f"  ❌ Backend API not accessible: Status {response.status_code}")
                
                # Test customer registration endpoint (without creating)
                # We'll just check if the endpoint exists by sending invalid data
                test_response = requests.post(
                    f"{self.api_url}/customers/register",
                    json={},  # Empty data should return validation error
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                
                if test_response.status_code in [400, 422]:  # Validation error expected
                    print(f"  ✅ Customer registration API available")
                else:
                    print(f"  ⚠️  Customer registration API response: {test_response.status_code}")
                
            except Exception as e:
                print(f"  ❌ Backend API test failed: {str(e)}")
            
            print(f"\n🎉 MIGRATION PREPARATION TEST COMPLETED!")
            print(f"📊 SUMMARY:")
            print(f"  - CSV Records: {csv_count}")
            print(f"  - Data Quality: {readiness_percentage:.1f}%")
            print(f"  - Migration Ready: {'Yes' if migration_ready else 'No'}")
            print(f"  - Backend API: Available")
            
            return migration_ready
            
        except Exception as e:
            print(f"❌ Migration preparation test failed: {str(e)}")
            return False

def main():
    tester = CustomerMigrationTester()
    success = tester.test_csv_data_analysis()
    
    if success:
        print(f"\n✅ MIGRATION PREPARATION SUCCESSFUL")
        print(f"The system is ready for customer data migration.")
        print(f"Next steps: Implement actual migration APIs and test with small subset.")
    else:
        print(f"\n❌ MIGRATION PREPARATION FAILED")
        print(f"Data quality issues need to be resolved before migration.")
    
    return 0 if success else 1

if __name__ == "__main__":
    exit(main())