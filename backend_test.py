#!/usr/bin/env python3
"""
Backend API Testing Suite
Tests all backend endpoints after UI navigation fixes and file cleanup
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Use the production URL from frontend/.env
BASE_URL = "https://interface-lab-2.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, passed, details=""):
        """Log test result"""
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            status = "✅ PASS"
        else:
            status = "❌ FAIL"
        
        result = f"{status}: {test_name}"
        if details:
            result += f" - {details}"
        
        print(result)
        self.test_results.append({
            'test': test_name,
            'passed': passed,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_api_health_check(self):
        """Test GET /api/ endpoint"""
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
        """Test GET /api/telegram/status endpoint"""
        try:
            response = self.session.get(f"{BASE_URL}/telegram/status")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["authenticated", "phone_number", "has_session", "user_profile"]
                
                # Check if all required fields are present (they can be null/false)
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    auth_status = "authenticated" if data.get("authenticated") else "not authenticated"
                    phone = data.get("phone_number", "None")
                    self.log_test("Telegram Status Check", True, f"Status: {auth_status}, Phone: {phone}")
                    return True
                else:
                    self.log_test("Telegram Status Check", False, f"Missing fields: {missing_fields}")
                    return False
            else:
                self.log_test("Telegram Status Check", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Telegram Status Check", False, f"Exception: {str(e)}")
            return False
    
    def test_telegram_config_endpoints(self):
        """Test Telegram configuration endpoints"""
        # Test GET /api/telegram/config
        try:
            response = self.session.get(f"{BASE_URL}/telegram/config")
            
            if response.status_code == 200:
                self.log_test("GET Telegram Config", True, "Config endpoint accessible")
            else:
                self.log_test("GET Telegram Config", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("GET Telegram Config", False, f"Exception: {str(e)}")
            return False
        
        # Test POST /api/telegram/config with sample data
        try:
            test_config = {
                "api_id": 12345,
                "api_hash": "test_hash_for_testing",
                "phone_number": "+1234567890"
            }
            
            response = self.session.post(f"{BASE_URL}/telegram/config", json=test_config)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "api_id" in data:
                    self.log_test("POST Telegram Config", True, "Config creation successful")
                    return True
                else:
                    self.log_test("POST Telegram Config", False, "Invalid response structure")
                    return False
            else:
                self.log_test("POST Telegram Config", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("POST Telegram Config", False, f"Exception: {str(e)}")
            return False
    
    def test_groups_endpoints(self):
        """Test Groups CRUD endpoints"""
        # Test GET /api/groups
        try:
            response = self.session.get(f"{BASE_URL}/groups")
            
            if response.status_code == 200:
                groups = response.json()
                self.log_test("GET Groups", True, f"Retrieved {len(groups)} groups")
            else:
                self.log_test("GET Groups", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("GET Groups", False, f"Exception: {str(e)}")
            return False
        
        # Test POST /api/groups with different identifier formats
        test_groups = [
            {"group_identifier": "@testgroup", "is_active": True},
            {"group_identifier": "https://t.me/testgroup2", "is_active": True},
            {"group_identifier": "-1001234567890", "is_active": True}
        ]
        
        created_group_ids = []
        
        for i, group_data in enumerate(test_groups):
            try:
                response = self.session.post(f"{BASE_URL}/groups", json=group_data)
                
                if response.status_code == 200:
                    data = response.json()
                    if "id" in data and "parsed_name" in data and "group_type" in data:
                        created_group_ids.append(data["id"])
                        self.log_test(f"POST Group {i+1}", True, f"Type: {data['group_type']}, Name: {data['parsed_name']}")
                    else:
                        self.log_test(f"POST Group {i+1}", False, "Invalid response structure")
                else:
                    self.log_test(f"POST Group {i+1}", False, f"HTTP {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"POST Group {i+1}", False, f"Exception: {str(e)}")
        
        return len(created_group_ids) > 0
    
    def test_bulk_groups_import(self):
        """Test POST /api/groups/bulk endpoint"""
        try:
            bulk_data = {
                "groups": [
                    "@bulktest1",
                    "https://t.me/bulktest2", 
                    "-1001111111111",
                    "https://t.me/joinchat/testinvite",
                    "",  # Empty string should be skipped
                    "   ",  # Whitespace should be skipped
                ]
            }
            
            response = self.session.post(f"{BASE_URL}/groups/bulk", json=bulk_data)
            
            if response.status_code == 200:
                created_groups = response.json()
                self.log_test("Bulk Groups Import", True, f"Created {len(created_groups)} groups from bulk import")
                return True
            else:
                self.log_test("Bulk Groups Import", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Bulk Groups Import", False, f"Exception: {str(e)}")
            return False
    
    def test_messages_endpoints(self):
        """Test Message Templates CRUD endpoints"""
        # Test GET /api/messages
        try:
            response = self.session.get(f"{BASE_URL}/messages")
            
            if response.status_code == 200:
                messages = response.json()
                self.log_test("GET Messages", True, f"Retrieved {len(messages)} message templates")
            else:
                self.log_test("GET Messages", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("GET Messages", False, f"Exception: {str(e)}")
            return False
        
        # Test POST /api/messages
        try:
            test_message = {
                "title": "Test Message Template",
                "content": "This is a test message for API testing purposes.",
                "is_active": True
            }
            
            response = self.session.post(f"{BASE_URL}/messages", json=test_message)
            
            if response.status_code == 200:
                data = response.json()
                if "id" in data and "title" in data and "content" in data:
                    self.log_test("POST Message Template", True, f"Created template: {data['title']}")
                    return True
                else:
                    self.log_test("POST Message Template", False, "Invalid response structure")
                    return False
            else:
                self.log_test("POST Message Template", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("POST Message Template", False, f"Exception: {str(e)}")
            return False
    
    def test_automation_config(self):
        """Test GET and PUT /api/automation/config endpoints"""
        # Test GET /api/automation/config
        try:
            response = self.session.get(f"{BASE_URL}/automation/config")
            
            if response.status_code == 200:
                config = response.json()
                required_fields = ["id", "is_active", "message_delay_min", "message_delay_max", 
                                 "cycle_delay_min", "cycle_delay_max", "auto_cleanup_blacklist"]
                
                if all(field in config for field in required_fields):
                    # Verify auto_cleanup_blacklist is always True
                    if config.get("auto_cleanup_blacklist") is True:
                        self.log_test("GET Automation Config", True, "Auto cleanup blacklist enforced: True")
                    else:
                        self.log_test("GET Automation Config", False, "Auto cleanup blacklist not enforced")
                        return False
                else:
                    missing = [f for f in required_fields if f not in config]
                    self.log_test("GET Automation Config", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("GET Automation Config", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("GET Automation Config", False, f"Exception: {str(e)}")
            return False
        
        # Test PUT /api/automation/config
        try:
            update_data = {
                "message_delay_min": 3,
                "message_delay_max": 8,
                "cycle_delay_min": 1.0,
                "cycle_delay_max": 1.5
            }
            
            response = self.session.put(f"{BASE_URL}/automation/config", json=update_data)
            
            if response.status_code == 200:
                updated_config = response.json()
                # Verify auto_cleanup_blacklist remains True after update
                if updated_config.get("auto_cleanup_blacklist") is True:
                    self.log_test("PUT Automation Config", True, "Config updated, auto cleanup still enforced")
                    return True
                else:
                    self.log_test("PUT Automation Config", False, "Auto cleanup blacklist not preserved")
                    return False
            else:
                self.log_test("PUT Automation Config", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("PUT Automation Config", False, f"Exception: {str(e)}")
            return False
    
    def test_automation_status_endpoints(self):
        """Test automation status and control endpoints"""
        # Test GET /api/automation/status
        try:
            response = self.session.get(f"{BASE_URL}/automation/status")
            
            if response.status_code == 200:
                status = response.json()
                required_fields = ["is_running", "current_cycle", "messages_sent_today"]
                
                if all(field in status for field in required_fields):
                    self.log_test("GET Automation Status", True, f"Running: {status.get('is_running')}")
                else:
                    missing = [f for f in required_fields if f not in status]
                    self.log_test("GET Automation Status", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("GET Automation Status", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("GET Automation Status", False, f"Exception: {str(e)}")
            return False
        
        # Test POST /api/automation/start (should fail without authentication)
        try:
            response = self.session.post(f"{BASE_URL}/automation/start")
            
            if response.status_code == 400:
                # Expected to fail without authentication
                self.log_test("POST Automation Start", True, "Correctly requires authentication")
            else:
                self.log_test("POST Automation Start", False, f"Unexpected HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("POST Automation Start", False, f"Exception: {str(e)}")
            return False
        
        # Test POST /api/automation/stop
        try:
            response = self.session.post(f"{BASE_URL}/automation/stop")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("POST Automation Stop", True, "Stop endpoint functional")
                    return True
                else:
                    self.log_test("POST Automation Stop", False, "Invalid response structure")
                    return False
            else:
                self.log_test("POST Automation Stop", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("POST Automation Stop", False, f"Exception: {str(e)}")
            return False
    
    def test_telegram_logout(self):
        """Test POST /api/telegram/logout endpoint"""
        try:
            response = self.session.post(f"{BASE_URL}/telegram/logout")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("POST Telegram Logout", True, "Logout endpoint functional")
                    return True
                else:
                    self.log_test("POST Telegram Logout", False, "Invalid response structure")
                    return False
            else:
                self.log_test("POST Telegram Logout", False, f"HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("POST Telegram Logout", False, f"Exception: {str(e)}")
            return False
    
    def test_authentication_endpoints(self):
        """Test authentication endpoints (should handle unauthenticated requests properly)"""
        # Test POST /api/telegram/send-code (should fail without valid config)
        try:
            response = self.session.post(f"{BASE_URL}/telegram/send-code")
            
            if response.status_code in [400, 404]:
                # Expected to fail without valid config
                self.log_test("POST Send Code", True, "Correctly handles missing/invalid config")
            else:
                self.log_test("POST Send Code", False, f"Unexpected HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("POST Send Code", False, f"Exception: {str(e)}")
            return False
        
        # Test POST /api/telegram/verify-code (should fail without pending auth)
        try:
            test_code = {"phone_code": "12345"}
            response = self.session.post(f"{BASE_URL}/telegram/verify-code", json=test_code)
            
            if response.status_code in [400, 404]:
                # Expected to fail without pending authentication
                self.log_test("POST Verify Code", True, "Correctly handles no pending auth")
                return True
            else:
                self.log_test("POST Verify Code", False, f"Unexpected HTTP {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("POST Verify Code", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 BACKEND API REGRESSION TESTING STARTED")
        print(f"Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Core API tests
        self.test_api_health_check()
        self.test_telegram_status()
        
        # Configuration tests
        self.test_telegram_config_endpoints()
        
        # CRUD operations tests
        self.test_groups_endpoints()
        self.test_bulk_groups_import()
        self.test_messages_endpoints()
        
        # Automation tests
        self.test_automation_config()
        self.test_automation_status_endpoints()
        
        # Authentication and logout tests
        self.test_authentication_endpoints()
        self.test_telegram_logout()
        
        # Print summary
        print("=" * 60)
        print(f"🎯 TESTING COMPLETE: {self.passed_tests}/{self.total_tests} tests passed")
        
        if self.passed_tests == self.total_tests:
            print("✅ ALL TESTS PASSED - No regressions detected")
            return True
        else:
            failed_tests = self.total_tests - self.passed_tests
            print(f"❌ {failed_tests} TESTS FAILED - Issues detected")
            return False

def main():
    """Main test execution"""
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()