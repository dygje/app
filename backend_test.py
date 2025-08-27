import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class TelegramAutomationAPITester:
    def __init__(self, base_url="https://telegram-auto.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'messages': [],
            'groups': [],
            'blacklist': []
        }

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint.lstrip('/')}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'id' in response_data:
                        print(f"   Response ID: {response_data['id']}")
                except:
                    response_data = {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Raw response: {response.text[:200]}")
                response_data = {}

            return success, response_data

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "/", 200)

    def test_telegram_config_endpoints(self):
        """Test Telegram configuration endpoints"""
        print("\n" + "="*50)
        print("TESTING TELEGRAM CONFIGURATION ENDPOINTS")
        print("="*50)
        
        # Test getting config (should be empty initially)
        success, config = self.run_test("Get Telegram Config", "GET", "/telegram/config", 200)
        
        # Test creating config
        config_data = {
            "api_id": 12345,
            "api_hash": "test_api_hash_12345",
            "phone_number": "+1234567890"
        }
        success, created_config = self.run_test(
            "Create Telegram Config", "POST", "/telegram/config", 200, config_data
        )
        
        # Test updating config
        if success and created_config:
            update_data = {
                "api_id": 54321,
                "phone_number": "+0987654321"
            }
            self.run_test(
                "Update Telegram Config", "PUT", "/telegram/config", 200, update_data
            )
        
        # Test getting status
        self.run_test("Get Telegram Status", "GET", "/telegram/status", 200)
        
        # Test auth endpoints (these will fail without real credentials, but should return proper errors)
        self.run_test("Send Auth Code", "POST", "/telegram/send-code", 400)
        
        auth_data = {"phone_code": "12345"}
        self.run_test("Verify Auth Code", "POST", "/telegram/verify-code", 400, auth_data)
        
        two_fa_data = {"password": "test_password"}
        self.run_test("Verify 2FA", "POST", "/telegram/verify-2fa", 400, two_fa_data)

    def test_message_templates_endpoints(self):
        """Test message templates CRUD operations"""
        print("\n" + "="*50)
        print("TESTING MESSAGE TEMPLATES ENDPOINTS")
        print("="*50)
        
        # Test getting empty list
        self.run_test("Get Message Templates (Empty)", "GET", "/messages", 200)
        
        # Test creating message template
        message_data = {
            "title": "Test Message Template",
            "content": "This is a test message template for automation testing.",
            "is_active": True
        }
        success, created_message = self.run_test(
            "Create Message Template", "POST", "/messages", 200, message_data
        )
        
        if success and created_message:
            message_id = created_message.get('id')
            if message_id:
                self.created_resources['messages'].append(message_id)
                
                # Test getting specific message
                self.run_test(
                    "Get Specific Message Template", "GET", f"/messages/{message_id}", 200
                )
                
                # Test updating message
                update_data = {
                    "title": "Updated Test Message Template",
                    "content": "This is an updated test message template.",
                    "is_active": False
                }
                self.run_test(
                    "Update Message Template", "PUT", f"/messages/{message_id}", 200, update_data
                )
        
        # Test getting all messages
        self.run_test("Get All Message Templates", "GET", "/messages", 200)
        
        # Test getting non-existent message
        self.run_test("Get Non-existent Message", "GET", "/messages/non-existent-id", 404)

    def test_group_targets_endpoints(self):
        """Test group targets CRUD operations"""
        print("\n" + "="*50)
        print("TESTING GROUP TARGETS ENDPOINTS")
        print("="*50)
        
        # Test getting empty list
        self.run_test("Get Group Targets (Empty)", "GET", "/groups", 200)
        
        # Test creating group target
        group_data = {
            "name": "Test Group",
            "group_link": "https://t.me/testgroup",
            "username": "@testgroup",
            "group_id": "test_group_123",
            "is_active": True
        }
        success, created_group = self.run_test(
            "Create Group Target", "POST", "/groups", 200, group_data
        )
        
        if success and created_group:
            group_id = created_group.get('id')
            if group_id:
                self.created_resources['groups'].append(group_id)
                
                # Test getting specific group
                self.run_test(
                    "Get Specific Group Target", "GET", f"/groups/{group_id}", 200
                )
                
                # Test updating group
                update_data = {
                    "name": "Updated Test Group",
                    "group_link": "https://t.me/updatedtestgroup",
                    "is_active": False
                }
                self.run_test(
                    "Update Group Target", "PUT", f"/groups/{group_id}", 200, update_data
                )
        
        # Test getting all groups
        self.run_test("Get All Group Targets", "GET", "/groups", 200)
        
        # Test getting non-existent group
        self.run_test("Get Non-existent Group", "GET", "/groups/non-existent-id", 404)

    def test_blacklist_endpoints(self):
        """Test blacklist management endpoints"""
        print("\n" + "="*50)
        print("TESTING BLACKLIST ENDPOINTS")
        print("="*50)
        
        # Test getting empty blacklist
        self.run_test("Get Blacklist (Empty)", "GET", "/blacklist", 200)
        
        # Test creating blacklist entry
        blacklist_data = {
            "group_id": "test_group_456",
            "group_name": "Test Blacklisted Group",
            "blacklist_type": "permanent",
            "reason": "Testing blacklist functionality"
        }
        success, created_entry = self.run_test(
            "Create Blacklist Entry", "POST", "/blacklist", 200, blacklist_data
        )
        
        if success and created_entry:
            entry_id = created_entry.get('id')
            if entry_id:
                self.created_resources['blacklist'].append(entry_id)
        
        # Test creating temporary blacklist entry
        temp_blacklist_data = {
            "group_id": "test_group_789",
            "group_name": "Temporary Blacklisted Group",
            "blacklist_type": "temporary",
            "reason": "Testing temporary blacklist",
            "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
        success, temp_entry = self.run_test(
            "Create Temporary Blacklist Entry", "POST", "/blacklist", 200, temp_blacklist_data
        )
        
        if success and temp_entry:
            temp_entry_id = temp_entry.get('id')
            if temp_entry_id:
                self.created_resources['blacklist'].append(temp_entry_id)
        
        # Test getting all blacklist entries
        self.run_test("Get All Blacklist Entries", "GET", "/blacklist", 200)
        
        # Test cleanup endpoint
        self.run_test("Cleanup Blacklist", "POST", "/blacklist/cleanup", 200)

    def test_automation_endpoints(self):
        """Test automation configuration endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTOMATION ENDPOINTS")
        print("="*50)
        
        # Test getting automation config
        self.run_test("Get Automation Config", "GET", "/automation/config", 200)
        
        # Test updating automation config
        config_update = {
            "is_active": False,
            "message_delay_min": 10,
            "message_delay_max": 20,
            "cycle_delay_min": 2.0,
            "cycle_delay_max": 3.0,
            "auto_cleanup_blacklist": True
        }
        self.run_test(
            "Update Automation Config", "PUT", "/automation/config", 200, config_update
        )
        
        # Test getting automation status
        self.run_test("Get Automation Status", "GET", "/automation/status", 200)
        
        # Test starting automation (should fail without telegram auth)
        self.run_test("Start Automation", "POST", "/automation/start", 400)
        
        # Test stopping automation
        self.run_test("Stop Automation", "POST", "/automation/stop", 200)

    def test_legacy_endpoints(self):
        """Test legacy status endpoints"""
        print("\n" + "="*50)
        print("TESTING LEGACY ENDPOINTS")
        print("="*50)
        
        # Test getting status checks
        self.run_test("Get Status Checks", "GET", "/status", 200)
        
        # Test creating status check
        status_data = {"client_name": "test_client"}
        self.run_test("Create Status Check", "POST", "/status", 200, status_data)

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n" + "="*50)
        print("CLEANING UP TEST RESOURCES")
        print("="*50)
        
        # Delete created messages
        for message_id in self.created_resources['messages']:
            self.run_test(
                f"Delete Message {message_id}", "DELETE", f"/messages/{message_id}", 200
            )
        
        # Delete created groups
        for group_id in self.created_resources['groups']:
            self.run_test(
                f"Delete Group {group_id}", "DELETE", f"/groups/{group_id}", 200
            )
        
        # Delete created blacklist entries
        for entry_id in self.created_resources['blacklist']:
            self.run_test(
                f"Delete Blacklist Entry {entry_id}", "DELETE", f"/blacklist/{entry_id}", 200
            )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Telegram Automation API Tests")
        print(f"Base URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        
        try:
            # Test all endpoints
            self.test_root_endpoint()
            self.test_telegram_config_endpoints()
            self.test_message_templates_endpoints()
            self.test_group_targets_endpoints()
            self.test_blacklist_endpoints()
            self.test_automation_endpoints()
            self.test_legacy_endpoints()
            
            # Clean up
            self.cleanup_resources()
            
        except Exception as e:
            print(f"\n❌ Test suite failed with error: {e}")
            return 1
        
        # Print final results
        print("\n" + "="*60)
        print("FINAL TEST RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = TelegramAutomationAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())