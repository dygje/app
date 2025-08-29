#!/usr/bin/env python3
"""
Comprehensive Backend API Testing Suite
Tests all API endpoints to verify functionality after frontend changes
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://ui-navigation-fix-1.preview.emergentagent.com/api"
TIMEOUT = 30

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.timeout = TIMEOUT
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, status, details=""):
        """Log test result"""
        self.total_tests += 1
        if status:
            self.passed_tests += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.test_results.append({
            'test': test_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_api_health_check(self):
        """Test API Health Check (GET /api/)"""
        try:
            response = self.session.get(f"{BASE_URL}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "version" in data:
                    self.log_test("API Health Check", True, f"Version: {data.get('version')}")
                    return True
                else:
                    self.log_test("API Health Check", False, "Missing required fields in response")
                    return False
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("API Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_telegram_status(self):
        """Test Telegram Status (GET /api/telegram/status)"""
        try:
            response = self.session.get(f"{BASE_URL}/telegram/status")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['authenticated', 'phone_number', 'has_session']
                
                if all(field in data for field in required_fields):
                    self.log_test("Telegram Status Endpoint", True, f"Auth: {data.get('authenticated')}")
                    return True
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Telegram Status Endpoint", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Telegram Status Endpoint", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Telegram Status Endpoint", False, f"Exception: {str(e)}")
            return False
    
    def test_telegram_config_get(self):
        """Test Telegram Config GET"""
        try:
            response = self.session.get(f"{BASE_URL}/telegram/config")
            
            if response.status_code == 200:
                # Config might be null if not set up
                data = response.json()
                self.log_test("Telegram Config GET", True, "Config retrieved successfully")
                return True
            else:
                self.log_test("Telegram Config GET", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Telegram Config GET", False, f"Exception: {str(e)}")
            return False
    
    def test_telegram_config_post(self):
        """Test Telegram Config POST"""
        try:
            # Test with sample data (will fail auth but should accept the data)
            test_config = {
                "api_id": 12345,
                "api_hash": "test_hash_12345",
                "phone_number": "+1234567890"
            }
            
            response = self.session.post(
                f"{BASE_URL}/telegram/config",
                json=test_config,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "api_id" in data and "phone_number" in data:
                    self.log_test("Telegram Config POST", True, "Config created/updated successfully")
                    return True
                else:
                    self.log_test("Telegram Config POST", False, "Invalid response structure")
                    return False
            else:
                self.log_test("Telegram Config POST", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Telegram Config POST", False, f"Exception: {str(e)}")
            return False
    
    def test_groups_crud(self):
        """Test Group Management CRUD Operations"""
        test_group_id = None
        
        # Test POST - Create Group
        try:
            test_group = {
                "group_identifier": "@testgroup123",
                "is_active": True
            }
            
            response = self.session.post(
                f"{BASE_URL}/groups",
                json=test_group,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                test_group_id = data.get('id')
                if test_group_id and "parsed_name" in data and "group_type" in data:
                    self.log_test("Groups POST (Create)", True, f"Group created with ID: {test_group_id}")
                else:
                    self.log_test("Groups POST (Create)", False, "Missing required fields in response")
                    return False
            else:
                self.log_test("Groups POST (Create)", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Groups POST (Create)", False, f"Exception: {str(e)}")
            return False
        
        # Test GET - List Groups
        try:
            response = self.session.get(f"{BASE_URL}/groups")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Groups GET (List)", True, f"Retrieved {len(data)} groups")
                else:
                    self.log_test("Groups GET (List)", False, "Response is not a list")
            else:
                self.log_test("Groups GET (List)", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Groups GET (List)", False, f"Exception: {str(e)}")
        
        # Test PUT - Update Group (if we have an ID)
        if test_group_id:
            try:
                update_data = {
                    "group_identifier": "@updatedgroup123",
                    "is_active": False
                }
                
                response = self.session.put(
                    f"{BASE_URL}/groups/{test_group_id}",
                    json=update_data,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('group_identifier') == "@updatedgroup123":
                        self.log_test("Groups PUT (Update)", True, "Group updated successfully")
                    else:
                        self.log_test("Groups PUT (Update)", False, "Update not reflected in response")
                else:
                    self.log_test("Groups PUT (Update)", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test("Groups PUT (Update)", False, f"Exception: {str(e)}")
            
            # Test DELETE - Delete Group
            try:
                response = self.session.delete(f"{BASE_URL}/groups/{test_group_id}")
                
                if response.status_code == 200:
                    self.log_test("Groups DELETE", True, "Group deleted successfully")
                else:
                    self.log_test("Groups DELETE", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test("Groups DELETE", False, f"Exception: {str(e)}")
        
        return True
    
    def test_groups_bulk_import(self):
        """Test Bulk Group Import"""
        try:
            bulk_data = {
                "groups": [
                    "@bulkgroup1",
                    "https://t.me/bulkgroup2", 
                    "-1001234567890",
                    "https://t.me/joinchat/testinvite",
                    "",  # Empty string should be skipped
                    "@bulkgroup1"  # Duplicate should be skipped
                ]
            }
            
            response = self.session.post(
                f"{BASE_URL}/groups/bulk",
                json=bulk_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Should create groups but skip empty and duplicates
                    self.log_test("Groups Bulk Import", True, f"Created {len(data)} groups from bulk import")
                    
                    # Clean up created groups
                    for group in data:
                        try:
                            self.session.delete(f"{BASE_URL}/groups/{group['id']}")
                        except:
                            pass
                    
                    return True
                else:
                    self.log_test("Groups Bulk Import", False, "Response is not a list")
                    return False
            else:
                self.log_test("Groups Bulk Import", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Groups Bulk Import", False, f"Exception: {str(e)}")
            return False
    
    def test_message_templates_crud(self):
        """Test Message Templates CRUD Operations"""
        test_template_id = None
        
        # Test POST - Create Template
        try:
            test_template = {
                "title": "Test Template",
                "content": "This is a test message template for API testing",
                "is_active": True
            }
            
            response = self.session.post(
                f"{BASE_URL}/messages",
                json=test_template,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                test_template_id = data.get('id')
                if test_template_id and data.get('title') == "Test Template":
                    self.log_test("Message Templates POST (Create)", True, f"Template created with ID: {test_template_id}")
                else:
                    self.log_test("Message Templates POST (Create)", False, "Missing required fields in response")
                    return False
            else:
                self.log_test("Message Templates POST (Create)", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Message Templates POST (Create)", False, f"Exception: {str(e)}")
            return False
        
        # Test GET - List Templates
        try:
            response = self.session.get(f"{BASE_URL}/messages")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Message Templates GET (List)", True, f"Retrieved {len(data)} templates")
                else:
                    self.log_test("Message Templates GET (List)", False, "Response is not a list")
            else:
                self.log_test("Message Templates GET (List)", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Message Templates GET (List)", False, f"Exception: {str(e)}")
        
        # Test GET Single Template (if we have an ID)
        if test_template_id:
            try:
                response = self.session.get(f"{BASE_URL}/messages/{test_template_id}")
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('id') == test_template_id:
                        self.log_test("Message Templates GET (Single)", True, "Template retrieved successfully")
                    else:
                        self.log_test("Message Templates GET (Single)", False, "ID mismatch in response")
                else:
                    self.log_test("Message Templates GET (Single)", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test("Message Templates GET (Single)", False, f"Exception: {str(e)}")
        
        # Test PUT - Update Template (if we have an ID)
        if test_template_id:
            try:
                update_data = {
                    "title": "Updated Test Template",
                    "content": "This is an updated test message template",
                    "is_active": False
                }
                
                response = self.session.put(
                    f"{BASE_URL}/messages/{test_template_id}",
                    json=update_data,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('title') == "Updated Test Template":
                        self.log_test("Message Templates PUT (Update)", True, "Template updated successfully")
                    else:
                        self.log_test("Message Templates PUT (Update)", False, "Update not reflected in response")
                else:
                    self.log_test("Message Templates PUT (Update)", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test("Message Templates PUT (Update)", False, f"Exception: {str(e)}")
            
            # Test DELETE - Delete Template
            try:
                response = self.session.delete(f"{BASE_URL}/messages/{test_template_id}")
                
                if response.status_code == 200:
                    self.log_test("Message Templates DELETE", True, "Template deleted successfully")
                else:
                    self.log_test("Message Templates DELETE", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test("Message Templates DELETE", False, f"Exception: {str(e)}")
        
        return True
    
    def test_automation_config(self):
        """Test Automation Configuration"""
        # Test GET - Get Config
        try:
            response = self.session.get(f"{BASE_URL}/automation/config")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['is_active', 'message_delay_min', 'message_delay_max', 'auto_cleanup_blacklist']
                
                if all(field in data for field in required_fields):
                    # Verify auto_cleanup_blacklist is always True
                    if data.get('auto_cleanup_blacklist') == True:
                        self.log_test("Automation Config GET", True, f"Config retrieved, auto_cleanup: {data.get('auto_cleanup_blacklist')}")
                    else:
                        self.log_test("Automation Config GET", False, "auto_cleanup_blacklist should always be True")
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Automation Config GET", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Automation Config GET", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Automation Config GET", False, f"Exception: {str(e)}")
            return False
        
        # Test PUT - Update Config
        try:
            update_data = {
                "message_delay_min": 3,
                "message_delay_max": 8,
                "cycle_delay_min": 1.0,
                "cycle_delay_max": 1.5
            }
            
            response = self.session.put(
                f"{BASE_URL}/automation/config",
                json=update_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                # Verify auto_cleanup_blacklist is still True after update
                if (data.get('message_delay_min') == 3 and 
                    data.get('auto_cleanup_blacklist') == True):
                    self.log_test("Automation Config PUT", True, "Config updated successfully, auto_cleanup preserved")
                    return True
                else:
                    self.log_test("Automation Config PUT", False, "Update failed or auto_cleanup not preserved")
                    return False
            else:
                self.log_test("Automation Config PUT", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Automation Config PUT", False, f"Exception: {str(e)}")
            return False
    
    def test_automation_status_and_control(self):
        """Test Automation Status and Control"""
        # Test GET Status
        try:
            response = self.session.get(f"{BASE_URL}/automation/status")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['is_running', 'current_cycle', 'messages_sent_today']
                
                if all(field in data for field in required_fields):
                    self.log_test("Automation Status GET", True, f"Running: {data.get('is_running')}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Automation Status GET", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Automation Status GET", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Automation Status GET", False, f"Exception: {str(e)}")
            return False
        
        # Test POST Start (will fail without auth but should handle gracefully)
        try:
            response = self.session.post(f"{BASE_URL}/automation/start")
            
            # Should return 400 due to no authentication, but endpoint should exist
            if response.status_code in [400, 401]:
                self.log_test("Automation Start POST", True, "Endpoint exists and handles unauthenticated requests")
            elif response.status_code == 200:
                self.log_test("Automation Start POST", True, "Automation started successfully")
            else:
                self.log_test("Automation Start POST", False, f"Unexpected HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Automation Start POST", False, f"Exception: {str(e)}")
            return False
        
        # Test POST Stop
        try:
            response = self.session.post(f"{BASE_URL}/automation/stop")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Automation Stop POST", True, "Automation stopped successfully")
                else:
                    self.log_test("Automation Stop POST", False, "Missing message in response")
            else:
                self.log_test("Automation Stop POST", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Automation Stop POST", False, f"Exception: {str(e)}")
        
        return True
    
    def test_additional_endpoints(self):
        """Test additional endpoints for completeness"""
        # Test send-code endpoint (will fail without real credentials)
        try:
            response = self.session.post(f"{BASE_URL}/telegram/send-code")
            
            # Should return 404 or 400, but endpoint should exist
            if response.status_code in [400, 404]:
                self.log_test("Telegram Send-Code Endpoint", True, "Endpoint exists and handles requests")
            else:
                self.log_test("Telegram Send-Code Endpoint", False, f"Unexpected HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Telegram Send-Code Endpoint", False, f"Exception: {str(e)}")
        
        # Test verify-code endpoint
        try:
            test_data = {"phone_code": "12345"}
            response = self.session.post(
                f"{BASE_URL}/telegram/verify-code",
                json=test_data,
                headers={'Content-Type': 'application/json'}
            )
            
            # Should return 400, but endpoint should exist
            if response.status_code == 400:
                self.log_test("Telegram Verify-Code Endpoint", True, "Endpoint exists and handles requests")
            else:
                self.log_test("Telegram Verify-Code Endpoint", False, f"Unexpected HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Telegram Verify-Code Endpoint", False, f"Exception: {str(e)}")
        
        # Test profile endpoint (should return 401 for unauthenticated)
        try:
            response = self.session.get(f"{BASE_URL}/telegram/profile")
            
            if response.status_code == 401:
                self.log_test("Telegram Profile Endpoint", True, "Endpoint exists and requires authentication")
            else:
                self.log_test("Telegram Profile Endpoint", False, f"Expected 401, got HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Telegram Profile Endpoint", False, f"Exception: {str(e)}")
        
        # Test logout endpoint
        try:
            response = self.session.post(f"{BASE_URL}/telegram/logout")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Telegram Logout Endpoint", True, "Endpoint works correctly")
                else:
                    self.log_test("Telegram Logout Endpoint", False, "Missing message in response")
            else:
                self.log_test("Telegram Logout Endpoint", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Telegram Logout Endpoint", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Comprehensive Backend API Testing")
        print(f"📡 Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Core API Tests
        print("\n📋 CORE API TESTS")
        self.test_api_health_check()
        
        # Telegram Configuration Tests
        print("\n📱 TELEGRAM CONFIGURATION TESTS")
        self.test_telegram_status()
        self.test_telegram_config_get()
        self.test_telegram_config_post()
        
        # Group Management Tests
        print("\n👥 GROUP MANAGEMENT TESTS")
        self.test_groups_crud()
        self.test_groups_bulk_import()
        
        # Message Templates Tests
        print("\n💬 MESSAGE TEMPLATES TESTS")
        self.test_message_templates_crud()
        
        # Automation Tests
        print("\n🤖 AUTOMATION TESTS")
        self.test_automation_config()
        self.test_automation_status_and_control()
        
        # Additional Endpoints
        print("\n🔧 ADDITIONAL ENDPOINTS TESTS")
        self.test_additional_endpoints()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print(f"✅ Passed: {self.passed_tests}/{self.total_tests}")
        print(f"❌ Failed: {self.total_tests - self.passed_tests}/{self.total_tests}")
        
        if self.passed_tests == self.total_tests:
            print("🎉 ALL TESTS PASSED! Backend is fully functional.")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return False

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.total_tests,
            'passed_tests': tester.passed_tests,
            'success_rate': f"{(tester.passed_tests/tester.total_tests)*100:.1f}%",
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())