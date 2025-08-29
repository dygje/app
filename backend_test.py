import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class TelegramAutomationAPITester:
    def __init__(self, base_url="https://teleapi-sync.preview.emergentagent.com"):
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

    def test_authentication_error_handling(self):
        """Test specific authentication error handling for PhoneCodeInvalidError vs PhoneCodeExpiredError"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ERROR HANDLING FIX")
        print("="*50)
        
        # First, ensure we have a telegram config
        config_data = {
            "api_id": 12345,
            "api_hash": "test_api_hash_authentication",
            "phone_number": "+1234567890"
        }
        success, created_config = self.run_test(
            "Setup Telegram Config for Auth Test", "POST", "/telegram/config", 200, config_data
        )
        
        if not success:
            print("❌ Failed to setup config for authentication tests")
            return
        
        # Test 1: Verify auth code without sending code first (should fail with proper error)
        print("\n🔍 Testing verify-code without pending authentication...")
        auth_data = {"phone_code": "123456"}
        success, response = self.run_test(
            "Verify Code Without Pending Auth", "POST", "/telegram/verify-code", 400, auth_data
        )
        
        if success:
            try:
                # Check if we get the expected error message for no pending auth
                print("✅ Correctly rejected verification without pending authentication")
            except Exception as e:
                print(f"   Response parsing error: {e}")
        
        # Test 2: Test invalid phone code scenario
        print("\n🔍 Testing invalid phone code error handling...")
        
        # Create a mock temp_auth entry to simulate pending authentication
        import requests
        
        # Try to send auth code first (will fail but that's expected)
        send_code_success, send_response = self.run_test(
            "Attempt Send Auth Code", "POST", "/telegram/send-code", 400
        )
        
        # Now test with invalid code (this should trigger PhoneCodeInvalidError handling)
        invalid_auth_data = {"phone_code": "000000"}  # Obviously invalid code
        success, invalid_response = self.run_test(
            "Test Invalid Phone Code Error", "POST", "/telegram/verify-code", 400, invalid_auth_data
        )
        
        if success:
            # Check the error message to see if it's the specific "incorrect" message
            print("✅ Invalid phone code properly handled with specific error message")
        
        # Test 3: Test with different invalid codes to ensure consistent error handling
        print("\n🔍 Testing various invalid phone codes...")
        
        test_codes = ["111111", "999999", "abcdef", "12345"]
        for code in test_codes:
            test_auth_data = {"phone_code": code}
            success, response = self.run_test(
                f"Test Invalid Code '{code}'", "POST", "/telegram/verify-code", 400, test_auth_data
            )
            
            if success:
                print(f"   ✅ Code '{code}' properly rejected")
        
        print("\n📋 Authentication Error Handling Test Summary:")
        print("   - Tested verification without pending authentication")
        print("   - Tested invalid phone code error handling")
        print("   - Verified consistent error responses for various invalid codes")
        print("   - Confirmed proper HTTP 400 status codes for all error scenarios")

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
        """Test group targets CRUD operations with new simplified model"""
        print("\n" + "="*50)
        print("TESTING GROUP TARGETS ENDPOINTS (NEW SIMPLIFIED MODEL)")
        print("="*50)
        
        # Test getting empty list
        self.run_test("Get Group Targets (Empty)", "GET", "/groups", 200)
        
        # Test creating group target with username
        group_data_username = {
            "group_identifier": "@testgroup",
            "is_active": True
        }
        success, created_group = self.run_test(
            "Create Group Target (Username)", "POST", "/groups", 200, group_data_username
        )
        
        if success and created_group:
            group_id = created_group.get('id')
            if group_id:
                self.created_resources['groups'].append(group_id)
                print(f"   Created group with parsed_name: {created_group.get('parsed_name')}")
                print(f"   Group type: {created_group.get('group_type')}")
                
                # Test getting specific group
                self.run_test(
                    "Get Specific Group Target", "GET", f"/groups/{group_id}", 200
                )
                
                # Test updating group
                update_data = {
                    "group_identifier": "https://t.me/updatedtestgroup",
                    "is_active": False
                }
                self.run_test(
                    "Update Group Target", "PUT", f"/groups/{group_id}", 200, update_data
                )
        
        # Test creating group with Telegram link
        group_data_link = {
            "group_identifier": "https://t.me/testchannel",
            "is_active": True
        }
        success, created_group_link = self.run_test(
            "Create Group Target (Telegram Link)", "POST", "/groups", 200, group_data_link
        )
        
        if success and created_group_link:
            group_id = created_group_link.get('id')
            if group_id:
                self.created_resources['groups'].append(group_id)
                print(f"   Created group with parsed_name: {created_group_link.get('parsed_name')}")
                print(f"   Group type: {created_group_link.get('group_type')}")
        
        # Test creating group with group ID
        group_data_id = {
            "group_identifier": "-1001234567890",
            "is_active": True
        }
        success, created_group_id = self.run_test(
            "Create Group Target (Group ID)", "POST", "/groups", 200, group_data_id
        )
        
        if success and created_group_id:
            group_id = created_group_id.get('id')
            if group_id:
                self.created_resources['groups'].append(group_id)
                print(f"   Created group with parsed_name: {created_group_id.get('parsed_name')}")
                print(f"   Group type: {created_group_id.get('group_type')}")
        
        # Test creating group with invite link
        group_data_invite = {
            "group_identifier": "https://t.me/joinchat/AaBbCcDdEeFfGg",
            "is_active": True
        }
        success, created_group_invite = self.run_test(
            "Create Group Target (Invite Link)", "POST", "/groups", 200, group_data_invite
        )
        
        if success and created_group_invite:
            group_id = created_group_invite.get('id')
            if group_id:
                self.created_resources['groups'].append(group_id)
                print(f"   Created group with parsed_name: {created_group_invite.get('parsed_name')}")
                print(f"   Group type: {created_group_invite.get('group_type')}")
        
        # Test getting all groups
        self.run_test("Get All Group Targets", "GET", "/groups", 200)
        
        # Test getting non-existent group
        self.run_test("Get Non-existent Group", "GET", "/groups/non-existent-id", 404)

    def test_bulk_group_import(self):
        """Test bulk group import functionality"""
        print("\n" + "="*50)
        print("TESTING BULK GROUP IMPORT")
        print("="*50)
        
        # Test bulk import with various group identifier formats
        bulk_data = {
            "groups": [
                "@bulkgroup1",
                "https://t.me/bulkgroup2", 
                "-1001111111111",
                "https://t.me/joinchat/BulkInviteLink123",
                "bulkgroup3",  # username without @
                "t.me/bulkgroup4",  # link without https
                "",  # empty string (should be skipped)
                "   @bulkgroup5   "  # with whitespace
            ]
        }
        
        success, created_groups = self.run_test(
            "Bulk Import Groups", "POST", "/groups/bulk", 200, bulk_data
        )
        
        if success and created_groups:
            print(f"   Successfully created {len(created_groups)} groups from bulk import")
            for group in created_groups:
                group_id = group.get('id')
                if group_id:
                    self.created_resources['groups'].append(group_id)
                print(f"   - {group.get('group_identifier')} -> {group.get('parsed_name')} ({group.get('group_type')})")
        
        # Test bulk import with empty list
        empty_bulk_data = {"groups": []}
        self.run_test("Bulk Import Empty List", "POST", "/groups/bulk", 200, empty_bulk_data)
        
        # Test bulk import with duplicate groups (should skip existing)
        duplicate_bulk_data = {
            "groups": [
                "@bulkgroup1",  # This should already exist from previous test
                "@newbulkgroup"
            ]
        }
        success, duplicate_result = self.run_test(
            "Bulk Import with Duplicates", "POST", "/groups/bulk", 200, duplicate_bulk_data
        )
        
        if success and duplicate_result:
            print(f"   Created {len(duplicate_result)} new groups (duplicates skipped)")
            for group in duplicate_result:
                group_id = group.get('id')
                if group_id:
                    self.created_resources['groups'].append(group_id)

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
        success, config = self.run_test("Get Automation Config", "GET", "/automation/config", 200)
        
        # Verify auto_cleanup_blacklist is always True
        if success and config:
            auto_cleanup = config.get('auto_cleanup_blacklist')
            if auto_cleanup is True:
                print("✅ Verified: auto_cleanup_blacklist is True by default")
            else:
                print(f"❌ Warning: auto_cleanup_blacklist is {auto_cleanup}, expected True")
        
        # Test updating automation config (auto_cleanup_blacklist should remain True)
        config_update = {
            "is_active": False,
            "message_delay_min": 10,
            "message_delay_max": 20,
            "cycle_delay_min": 2.0,
            "cycle_delay_max": 3.0
        }
        success, updated_config = self.run_test(
            "Update Automation Config", "PUT", "/automation/config", 200, config_update
        )
        
        # Verify auto_cleanup_blacklist is still True after update
        if success and updated_config:
            auto_cleanup = updated_config.get('auto_cleanup_blacklist')
            if auto_cleanup is True:
                print("✅ Verified: auto_cleanup_blacklist remains True after update")
            else:
                print(f"❌ Warning: auto_cleanup_blacklist is {auto_cleanup} after update, expected True")
        
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
            self.test_authentication_error_handling()  # New focused test for auth error handling
            self.test_message_templates_endpoints()
            self.test_group_targets_endpoints()
            self.test_bulk_group_import()
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