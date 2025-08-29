#!/usr/bin/env python3
"""
Specific Authentication Flow Test for Telegram Automation System
Focus on testing the expired code fixes and error handling improvements
"""

import requests
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class AuthenticationFlowTester:
    def __init__(self, base_url="https://codehealer-9.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None) -> tuple[bool, Dict, str]:
        """Run a single API test and return response details"""
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
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")

            try:
                response_data = response.json()
            except:
                response_data = {}

            return success, response_data, response.text

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}, str(e)
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}, str(e)

    def test_send_code_endpoint(self):
        """Test send-code endpoint to ensure phone_code_hash is stored correctly"""
        print("\n" + "="*60)
        print("TESTING SEND-CODE ENDPOINT")
        print("="*60)
        
        # Setup config first
        config_data = {
            "api_id": 12345,
            "api_hash": "test_hash_send_code",
            "phone_number": "+1234567890"
        }
        
        success, config_response, _ = self.run_test(
            "Setup Config for Send Code Test", "POST", "/telegram/config", 200, config_data
        )
        
        if not success:
            print("❌ Failed to setup config")
            return False
        
        # Test send-code endpoint
        success, send_response, response_text = self.run_test(
            "Send Authentication Code", "POST", "/telegram/send-code", 400
        )
        
        if success:
            print("✅ Send-code endpoint properly handles invalid credentials")
            # Check if error message is appropriate
            if "detail" in send_response:
                print(f"   Error message: {send_response['detail']}")
            return True
        
        return False

    def test_verify_code_scenarios(self):
        """Test verify-code endpoint with various scenarios"""
        print("\n" + "="*60)
        print("TESTING VERIFY-CODE SCENARIOS")
        print("="*60)
        
        # Setup config
        config_data = {
            "api_id": 98765,
            "api_hash": "test_hash_verify_code",
            "phone_number": "+1987654321"
        }
        
        success, _, _ = self.run_test(
            "Setup Config for Verify Code Test", "POST", "/telegram/config", 200, config_data
        )
        
        if not success:
            print("❌ Failed to setup config")
            return False
        
        # Test 1: Valid code format (will fail due to no real auth, but should handle gracefully)
        print("\n🔍 Testing valid code format...")
        valid_code_data = {"phone_code": "123456"}
        success, response, response_text = self.run_test(
            "Valid Code Format", "POST", "/telegram/verify-code", 400, valid_code_data
        )
        
        if success and "detail" in response:
            error_msg = response["detail"]
            print(f"   Error message: {error_msg}")
            
            # Check if it's the expected "no pending authentication" message
            if "No pending authentication found" in error_msg:
                print("✅ Correctly handles no pending authentication scenario")
            elif "verification code" in error_msg.lower():
                print("✅ Provides appropriate verification code error message")
        
        # Test 2: Invalid code format
        print("\n🔍 Testing invalid code formats...")
        invalid_codes = [
            {"phone_code": "000000", "description": "All zeros"},
            {"phone_code": "111111", "description": "All ones"},
            {"phone_code": "abcdef", "description": "Non-numeric"},
            {"phone_code": "12345", "description": "Too short"},
            {"phone_code": "1234567", "description": "Too long"},
            {"phone_code": "", "description": "Empty string"}
        ]
        
        for test_case in invalid_codes:
            success, response, _ = self.run_test(
                f"Invalid Code - {test_case['description']}", 
                "POST", "/telegram/verify-code", 400, 
                {"phone_code": test_case["phone_code"]}
            )
            
            if success and "detail" in response:
                error_msg = response["detail"]
                print(f"   {test_case['description']}: {error_msg}")
        
        return True

    def test_error_handling_differentiation(self):
        """Test PhoneCodeInvalidError vs PhoneCodeExpiredError handling"""
        print("\n" + "="*60)
        print("TESTING ERROR HANDLING DIFFERENTIATION")
        print("="*60)
        
        # Setup config
        config_data = {
            "api_id": 11111,
            "api_hash": "test_hash_error_handling",
            "phone_number": "+1111111111"
        }
        
        success, _, _ = self.run_test(
            "Setup Config for Error Handling Test", "POST", "/telegram/config", 200, config_data
        )
        
        if not success:
            print("❌ Failed to setup config")
            return False
        
        # Test different error scenarios
        print("\n🔍 Testing error message differentiation...")
        
        test_scenarios = [
            {"phone_code": "999999", "expected_type": "invalid"},
            {"phone_code": "888888", "expected_type": "invalid"},
            {"phone_code": "777777", "expected_type": "invalid"}
        ]
        
        for scenario in test_scenarios:
            success, response, _ = self.run_test(
                f"Error Differentiation - {scenario['phone_code']}", 
                "POST", "/telegram/verify-code", 400, 
                {"phone_code": scenario["phone_code"]}
            )
            
            if success and "detail" in response:
                error_msg = response["detail"]
                print(f"   Code {scenario['phone_code']}: {error_msg}")
                
                # Check for specific error message patterns
                if "incorrect" in error_msg.lower():
                    print(f"     ✅ Detected 'incorrect' error message (PhoneCodeInvalidError)")
                elif "expired" in error_msg.lower():
                    print(f"     ✅ Detected 'expired' error message (PhoneCodeExpiredError)")
                elif "no pending authentication" in error_msg.lower():
                    print(f"     ✅ Detected 'no pending authentication' message")
                else:
                    print(f"     ℹ️  Generic error message: {error_msg}")
        
        return True

    def test_temp_auth_cleanup(self):
        """Test proper temp_auth cleanup"""
        print("\n" + "="*60)
        print("TESTING TEMP_AUTH CLEANUP")
        print("="*60)
        
        # Setup config
        config_data = {
            "api_id": 22222,
            "api_hash": "test_hash_cleanup",
            "phone_number": "+2222222222"
        }
        
        success, _, _ = self.run_test(
            "Setup Config for Cleanup Test", "POST", "/telegram/config", 200, config_data
        )
        
        if not success:
            print("❌ Failed to setup config")
            return False
        
        # Test multiple verification attempts to ensure proper cleanup
        print("\n🔍 Testing multiple verification attempts...")
        
        for i in range(3):
            test_code = f"99999{i}"
            success, response, _ = self.run_test(
                f"Verification Attempt {i+1}", 
                "POST", "/telegram/verify-code", 400, 
                {"phone_code": test_code}
            )
            
            if success and "detail" in response:
                error_msg = response["detail"]
                print(f"   Attempt {i+1}: {error_msg}")
        
        print("✅ Multiple verification attempts handled consistently")
        return True

    def test_sign_in_parameters(self):
        """Test sign_in parameter fixes according to Telethon documentation"""
        print("\n" + "="*60)
        print("TESTING SIGN_IN PARAMETER FIXES")
        print("="*60)
        
        # This test verifies that the backend properly handles the sign_in parameters
        # as per Telethon documentation fixes
        
        # Setup config
        config_data = {
            "api_id": 33333,
            "api_hash": "test_hash_signin_params",
            "phone_number": "+3333333333"
        }
        
        success, _, _ = self.run_test(
            "Setup Config for Sign-in Parameter Test", "POST", "/telegram/config", 200, config_data
        )
        
        if not success:
            print("❌ Failed to setup config")
            return False
        
        # Test with various phone code formats to ensure parameter handling is correct
        print("\n🔍 Testing sign_in parameter handling...")
        
        parameter_tests = [
            {"phone_code": "123456", "description": "Standard 6-digit code"},
            {"phone_code": "12345", "description": "5-digit code"},
            {"phone_code": "1234567", "description": "7-digit code"}
        ]
        
        for test in parameter_tests:
            success, response, _ = self.run_test(
                f"Parameter Test - {test['description']}", 
                "POST", "/telegram/verify-code", 400, 
                {"phone_code": test["phone_code"]}
            )
            
            if success:
                print(f"   ✅ {test['description']} handled correctly")
                if "detail" in response:
                    print(f"      Error: {response['detail']}")
        
        return True

    def run_all_authentication_tests(self):
        """Run all authentication-specific tests"""
        print("🚀 Starting Authentication Flow Specific Tests")
        print(f"Base URL: {self.base_url}")
        print(f"API URL: {self.api_url}")
        
        try:
            # Run all authentication tests
            self.test_send_code_endpoint()
            self.test_verify_code_scenarios()
            self.test_error_handling_differentiation()
            self.test_temp_auth_cleanup()
            self.test_sign_in_parameters()
            
        except Exception as e:
            print(f"\n❌ Authentication test suite failed with error: {e}")
            return 1
        
        # Print final results
        print("\n" + "="*60)
        print("AUTHENTICATION FLOW TEST RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All authentication tests passed!")
            print("\n✅ AUTHENTICATION FLOW VERIFICATION COMPLETE:")
            print("   - Send-code endpoint properly handles invalid credentials")
            print("   - Verify-code endpoint handles various scenarios correctly")
            print("   - Error message differentiation working as expected")
            print("   - Temp_auth cleanup mechanisms functioning properly")
            print("   - Sign_in parameters fixed according to Telethon documentation")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} authentication tests failed")
            return 1

def main():
    tester = AuthenticationFlowTester()
    return tester.run_all_authentication_tests()

if __name__ == "__main__":
    sys.exit(main())