#!/usr/bin/env python3
import pymongo
import time
from datetime import datetime
import subprocess

MONGO_URL = "mongodb://localhost:27017"

class RealTimeAuthMonitor:
    def __init__(self):
        self.client = pymongo.MongoClient(MONGO_URL)
        self.db = self.client.telegram_automation
        
    def get_all_temp_auth(self):
        """Get all temp_auth records"""
        return list(self.db.temp_auth.find())
        
    def get_all_config(self):
        """Get all config records"""  
        return list(self.db.telegram_config.find())
        
    def monitor_changes(self, duration=300):  # 5 minutes
        """Monitor database changes in real-time"""
        print("🔍 REAL-TIME AUTHENTICATION MONITORING")
        print("=" * 50)
        print("Please proceed with your authentication in the browser...")
        print(f"Monitoring for {duration} seconds...")
        print("")
        
        start_time = time.time()
        last_temp_auth = []
        last_config = []
        
        while time.time() - start_time < duration:
            current_temp_auth = self.get_all_temp_auth()
            current_config = self.get_all_config()
            
            # Check for temp_auth changes
            if current_temp_auth != last_temp_auth:
                print(f"\n⚡ TEMP_AUTH CHANGE DETECTED at {datetime.now()}")
                for record in current_temp_auth:
                    phone = record.get('phone_number', 'Unknown')
                    created = record.get('created_at')
                    expires = record.get('expires_at')
                    hash_present = 'Yes' if record.get('phone_code_hash') else 'No'
                    
                    print(f"   📱 Phone: {phone}")
                    print(f"   🕐 Created: {created}")
                    print(f"   ⏰ Expires: {expires}")
                    print(f"   🔑 Hash present: {hash_present}")
                    
                    if expires:
                        now = datetime.utcnow()
                        if expires > now:
                            remaining = (expires - now).total_seconds()
                            print(f"   ⏳ Time remaining: {remaining:.1f} seconds")
                        else:
                            print(f"   ❌ ALREADY EXPIRED!")
                
                last_temp_auth = current_temp_auth.copy()
            
            # Check for config changes  
            if current_config != last_config:
                print(f"\n📋 CONFIG CHANGE DETECTED at {datetime.now()}")
                for record in current_config:
                    phone = record.get('phone_number', 'Unknown')
                    api_id = record.get('api_id')
                    has_session = 'Yes' if record.get('session_string') else 'No'
                    
                    print(f"   📱 Phone: {phone}")
                    print(f"   🆔 API ID: {api_id}")
                    print(f"   🔐 Has session: {has_session}")
                
                last_config = current_config.copy()
            
            time.sleep(1)  # Check every second
        
        print(f"\n⏹️ Monitoring stopped after {duration} seconds")
        
        # Final status
        print(f"\n📊 FINAL STATUS:")
        final_temp_auth = self.get_all_temp_auth()
        final_config = self.get_all_config()
        
        print(f"   Temp auth records: {len(final_temp_auth)}")
        print(f"   Config records: {len(final_config)}")
        
        return final_temp_auth, final_config

if __name__ == "__main__":
    monitor = RealTimeAuthMonitor()
    
    print("Starting real-time monitoring...")
    print("Please perform authentication in your browser now!")
    print("")
    
    temp_auth, config = monitor.monitor_changes(300)  # Monitor for 5 minutes