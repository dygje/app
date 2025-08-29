#!/usr/bin/env python3
import subprocess
import threading
import time
import pymongo
from datetime import datetime

class RealTimeDebugger:
    def __init__(self):
        self.monitoring = True
        self.client = pymongo.MongoClient('mongodb://localhost:27017')
        self.db = self.client.telegram_automation
        
    def monitor_logs(self):
        """Monitor backend logs in real-time"""
        print("🔍 MONITORING BACKEND LOGS...")
        try:
            proc = subprocess.Popen(['tail', '-f', '/var/log/supervisor/backend.out.log'], 
                                  stdout=subprocess.PIPE, 
                                  stderr=subprocess.PIPE,
                                  universal_newlines=True)
            
            while self.monitoring:
                line = proc.stdout.readline()
                if line:
                    # Filter for relevant lines
                    if any(keyword in line for keyword in ['send-code', 'verify-code', 'POST /api/telegram', 'ERROR', 'WARNING']):
                        print(f"📊 LOG: {line.strip()}")
                time.sleep(0.1)
                
        except Exception as e:
            print(f"❌ Log monitoring error: {e}")
    
    def monitor_database(self):
        """Monitor database changes in real-time"""
        print("🔍 MONITORING DATABASE CHANGES...")
        last_temp_auth_count = 0
        last_config_count = 0
        
        while self.monitoring:
            try:
                # Check temp_auth
                temp_auth_count = self.db.temp_auth.count_documents({})
                if temp_auth_count != last_temp_auth_count:
                    print(f"\n⚡ TEMP_AUTH COUNT CHANGED: {last_temp_auth_count} → {temp_auth_count}")
                    if temp_auth_count > 0:
                        latest = self.db.temp_auth.find().sort("created_at", -1).limit(1)
                        for record in latest:
                            print(f"   📱 Phone: {record.get('phone_number')}")
                            print(f"   🕐 Created: {record.get('created_at')}")
                            print(f"   ⏰ Expires: {record.get('expires_at')}")
                            print(f"   🔑 Has hash: {'Yes' if record.get('phone_code_hash') else 'No'}")
                    last_temp_auth_count = temp_auth_count
                
                # Check config
                config_count = self.db.telegram_config.count_documents({})
                if config_count != last_config_count:
                    print(f"\n⚡ CONFIG COUNT CHANGED: {last_config_count} → {config_count}")
                    last_config_count = config_count
                    
                time.sleep(1)
                
            except Exception as e:
                print(f"❌ Database monitoring error: {e}")
                time.sleep(1)
    
    def start_monitoring(self, duration=120):
        """Start monitoring for specified duration"""
        print("🚀 STARTING REAL-TIME DEBUGGING")
        print("=" * 60)
        print("Please perform authentication in your browser NOW!")
        print(f"Monitoring for {duration} seconds...")
        print("=" * 60)
        
        # Start monitoring threads
        log_thread = threading.Thread(target=self.monitor_logs)
        db_thread = threading.Thread(target=self.monitor_database)
        
        log_thread.daemon = True
        db_thread.daemon = True
        
        log_thread.start()
        db_thread.start()
        
        # Wait for specified duration
        time.sleep(duration)
        
        # Stop monitoring
        self.monitoring = False
        print(f"\n⏹️ Monitoring stopped after {duration} seconds")
        
        # Final status
        self.print_final_status()
    
    def print_final_status(self):
        """Print final database status"""
        print("\n📊 FINAL DATABASE STATUS:")
        print("-" * 40)
        
        temp_auth_count = self.db.temp_auth.count_documents({})
        config_count = self.db.telegram_config.count_documents({})
        
        print(f"Temp auth records: {temp_auth_count}")
        print(f"Config records: {config_count}")
        
        if temp_auth_count > 0:
            print("\n📋 TEMP_AUTH RECORDS:")
            for record in self.db.temp_auth.find():
                print(f"   Phone: {record.get('phone_number')}")
                print(f"   Created: {record.get('created_at')}")
                print(f"   Expires: {record.get('expires_at')}")
                print(f"   Has hash: {'Yes' if record.get('phone_code_hash') else 'No'}")
                
                if 'expires_at' in record:
                    now = datetime.utcnow()
                    if record['expires_at'] > now:
                        remaining = (record['expires_at'] - now).total_seconds()
                        print(f"   Status: VALID ({remaining:.1f}s remaining)")
                    else:
                        print(f"   Status: EXPIRED")
                print()

if __name__ == "__main__":
    debugger = RealTimeDebugger()
    debugger.start_monitoring(120)  # Monitor for 2 minutes