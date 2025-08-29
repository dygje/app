#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime
import pymongo
import os

# Configuration  
BASE_URL = "https://expiry-bug-fix.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"

class AuthFlowDebugger:
    def __init__(self):
        self.client = pymongo.MongoClient(MONGO_URL)
        self.db = self.client.telegram_automation
        
    def check_temp_auth_data(self, phone_number):
        """Check temp_auth data in MongoDB"""
        temp_auth = self.db.temp_auth.find_one({"phone_number": phone_number})
        if temp_auth:
            print(f"📋 temp_auth found:")
            print(f"   phone_number: {temp_auth['phone_number']}")
            print(f"   phone_code_hash: {temp_auth.get('phone_code_hash', 'MISSING')}")
            print(f"   created_at: {temp_auth.get('created_at')}")
            print(f"   expires_at: {temp_auth.get('expires_at')}")
            
            # Check if expired
            if 'expires_at' in temp_auth:
                now = datetime.utcnow()
                expires_at = temp_auth['expires_at']
                is_expired = expires_at < now
                print(f"   Current time: {now}")
                print(f"   Expires at: {expires_at}")
                print(f"   Is expired: {is_expired}")
                if not is_expired:
                    time_left = (expires_at - now).total_seconds()
                    print(f"   Time left: {time_left:.1f} seconds")
        else:
            print("❌ No temp_auth data found")
        return temp_auth
    
    def test_send_code(self, phone_number):
        """Test send-code endpoint"""
        print(f"\n🔄 Testing send-code for {phone_number}...")
        
        # First setup config
        config_data = {
            "api_id": 123456,
            "api_hash": "test_hash_real_debug",
            "phone_number": phone_number
        }
        
        try:
            response = requests.post(f"{BASE_URL}/telegram/config", json=config_data)
            print(f"Config response: {response.status_code}")
            
            # Send code
            response = requests.post(f"{BASE_URL}/telegram/send-code")
            print(f"Send code response: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Check temp_auth after send-code
            print("\n📊 Checking temp_auth after send-code:")
            return self.check_temp_auth_data(phone_number)
            
        except Exception as e:
            print(f"❌ Error in send-code: {e}")
            return None
    
    def test_verify_code(self, phone_code):
        """Test verify-code endpoint"""
        print(f"\n🔄 Testing verify-code with code: {phone_code}...")
        
        try:
            response = requests.post(f"{BASE_URL}/telegram/verify-code", json={"phone_code": phone_code})
            print(f"Verify code response: {response.status_code}")
            print(f"Response: {response.text}")
            
            return response.status_code, response.text
            
        except Exception as e:
            print(f"❌ Error in verify-code: {e}")
            return None, str(e)
    
    def debug_full_flow(self, phone_number, test_code="97231"):
        """Debug complete authentication flow"""
        print("=" * 60)
        print(f"🔍 DEBUGGING AUTH FLOW FOR {phone_number}")
        print("=" * 60)
        
        # Step 1: Clear any existing temp_auth
        print("\n🧹 Cleaning existing temp_auth...")
        self.db.temp_auth.delete_many({"phone_number": phone_number})
        
        # Step 2: Test send-code
        temp_auth = self.test_send_code(phone_number)
        
        # Step 3: Wait a moment
        print("\n⏳ Waiting 2 seconds...")
        time.sleep(2)
        
        # Step 4: Check temp_auth again
        print("\n📊 Re-checking temp_auth before verify:")
        self.check_temp_auth_data(phone_number)
        
        # Step 5: Test verify-code
        status, response = self.test_verify_code(test_code)
        
        # Step 6: Check temp_auth after verify
        print("\n📊 Checking temp_auth after verify:")
        self.check_temp_auth_data(phone_number)
        
        return status, response

if __name__ == "__main__":
    debugger = AuthFlowDebugger()
    
    # Test with the same phone number from config
    test_phone = "+1234567890"
    
    # Run debug
    status, response = debugger.debug_full_flow(test_phone)
    
    print(f"\n🎯 FINAL RESULT:")
    print(f"Status: {status}")
    print(f"Response: {response}")
    
    # Analysis
    if status == 400 and "expired" in response.lower():
        print("\n❌ CONFIRMED: Getting expired error")
        print("🔍 NEED TO INVESTIGATE:")
        print("   1. temp_auth timeout logic")
        print("   2. Database connection issues")
        print("   3. Race conditions")
        print("   4. Telethon session handling")
    elif status == 400 and "pending authentication" in response.lower():
        print("\n✅ EXPECTED: No pending auth error (normal for test credentials)")
    else:
        print(f"\n❓ OTHER ERROR: Need to investigate {response}")