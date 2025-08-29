from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import json
import asyncio
import secrets
from cryptography.fernet import Fernet
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, PhoneCodeExpiredError, PasswordHashInvalidError
from telethon.sessions import StringSession
import base64
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Encryption setup
encryption_key = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key().decode())
cipher_suite = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)

# Create the main app without a prefix
app = FastAPI(title="Telegram Automation System", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Global variable to store active telegram clients
telegram_clients: Dict[str, TelegramClient] = {}

# ========================== MODELS ==========================

class TelegramConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    api_id: int
    api_hash: str
    phone_number: str
    session_string: Optional[str] = None
    is_authenticated: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TelegramConfigCreate(BaseModel):
    api_id: int
    api_hash: str
    phone_number: str

class TelegramConfigUpdate(BaseModel):
    api_id: Optional[int] = None
    api_hash: Optional[str] = None
    phone_number: Optional[str] = None

class AuthRequest(BaseModel):
    phone_code: str

class TwoFactorAuth(BaseModel):
    password: str

class MessageTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MessageTemplateCreate(BaseModel):
    title: str
    content: str
    is_active: bool = True

class MessageTemplateUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None

class GroupTarget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_identifier: str  # Can be username, link, or ID
    parsed_name: str  # Auto-generated name from identifier
    group_type: str  # 'username', 'invite_link', 'group_id'
    resolved_id: Optional[str] = None  # Will be populated when actually accessed
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GroupTargetCreate(BaseModel):
    group_identifier: str
    is_active: bool = True

class GroupTargetUpdate(BaseModel):
    group_identifier: Optional[str] = None
    is_active: Optional[bool] = None

class GroupBulkImport(BaseModel):
    groups: List[str]

class BlacklistEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    group_id: str
    group_name: str
    blacklist_type: str  # "permanent" or "temporary"
    reason: str
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BlacklistEntryCreate(BaseModel):
    group_id: str
    group_name: str
    blacklist_type: str
    reason: str
    expires_at: Optional[datetime] = None

class AutomationConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = False
    message_delay_min: int = 5  # seconds
    message_delay_max: int = 10  # seconds
    cycle_delay_min: float = 1.1  # hours
    cycle_delay_max: float = 1.3  # hours
    auto_cleanup_blacklist: bool = True  # Always true now
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AutomationConfigUpdate(BaseModel):
    is_active: Optional[bool] = None
    message_delay_min: Optional[int] = None
    message_delay_max: Optional[int] = None
    cycle_delay_min: Optional[float] = None
    cycle_delay_max: Optional[float] = None

class AutomationStatus(BaseModel):
    is_running: bool = False
    current_cycle: int = 0
    messages_sent_today: int = 0
    last_message_sent: Optional[datetime] = None
    next_cycle_at: Optional[datetime] = None
    errors: List[str] = []

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# ========================== HELPER FUNCTIONS ==========================

def encrypt_data(data: str) -> str:
    """Encrypt sensitive data"""
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """Decrypt sensitive data"""
    return cipher_suite.decrypt(encrypted_data.encode()).decode()

def parse_group_identifier(identifier: str) -> Dict[str, str]:
    """Parse group identifier and determine its type"""
    identifier = identifier.strip()
    
    # Check if it's a group ID (starts with - and contains only numbers)
    if re.match(r'^-?\d+$', identifier):
        return {
            'type': 'group_id',
            'value': identifier,
            'name': f'Group {identifier}'
        }
    
    # Check if it's a Telegram link
    if 't.me/' in identifier:
        if '/joinchat/' in identifier or '/+' in identifier:
            # Invite link
            return {
                'type': 'invite_link', 
                'value': identifier,
                'name': f'Private Group ({identifier.split("/")[-1][:8]}...)'
            }
        else:
            # Public group link
            username = identifier.split('/')[-1].replace('@', '')
            return {
                'type': 'username',
                'value': username,
                'name': f'@{username}'
            }
    
    # Check if it's a username (starts with @ or just username)
    if identifier.startswith('@'):
        username = identifier[1:]
        return {
            'type': 'username',
            'value': username,
            'name': f'@{username}'
        }
    
    # Assume it's a username without @
    return {
        'type': 'username',
        'value': identifier,
        'name': f'@{identifier}'
    }

async def get_telegram_config() -> Optional[TelegramConfig]:
    """Get the current telegram configuration"""
    config = await db.telegram_config.find_one()
    if config:
        # Decrypt sensitive data
        if config.get('api_hash'):
            config['api_hash'] = decrypt_data(config['api_hash'])
        if config.get('session_string'):
            config['session_string'] = decrypt_data(config['session_string'])
        return TelegramConfig(**config)
    return None

async def save_telegram_config(config: TelegramConfig) -> TelegramConfig:
    """Save telegram configuration with encryption"""
    config_dict = config.dict()
    
    # Encrypt sensitive data
    if config_dict.get('api_hash'):
        config_dict['api_hash'] = encrypt_data(config_dict['api_hash'])
    if config_dict.get('session_string'):
        config_dict['session_string'] = encrypt_data(config_dict['session_string'])
    
    config_dict['updated_at'] = datetime.utcnow()
    
    await db.telegram_config.replace_one(
        {"_id": config_dict.get('_id', config_dict['id'])},
        config_dict,
        upsert=True
    )
    return config

async def get_automation_config() -> AutomationConfig:
    """Get automation configuration"""
    config = await db.automation_config.find_one()
    if config:
        # Ensure auto_cleanup_blacklist is always True
        config['auto_cleanup_blacklist'] = True
        return AutomationConfig(**config)
    
    # Create default config if not exists
    default_config = AutomationConfig()
    default_config.auto_cleanup_blacklist = True
    await db.automation_config.insert_one(default_config.dict())
    return default_config

async def cleanup_expired_blacklists():
    """Clean up expired temporary blacklists"""
    now = datetime.utcnow()
    result = await db.blacklist.delete_many({
        "blacklist_type": "temporary",
        "expires_at": {"$lt": now}
    })
    return result.deleted_count

# ========================== TELEGRAM CLIENT MANAGEMENT ==========================

async def initialize_telegram_client() -> Optional[TelegramClient]:
    """Initialize Telegram client with current config"""
    config = await get_telegram_config()
    if not config or not config.api_id or not config.api_hash:
        return None
    
    try:
        # Use StringSession for better portability
        session = StringSession(config.session_string) if config.session_string else StringSession()
        
        client = TelegramClient(
            session,
            config.api_id,
            config.api_hash
        )
        
        telegram_clients['main'] = client
        return client
    except Exception as e:
        logging.error(f"Failed to initialize Telegram client: {e}")
        return None

# ========================== API ENDPOINTS ==========================

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Telegram Automation System API", "version": "2.0.0"}

# ========================== TELEGRAM CONFIGURATION ==========================

@api_router.post("/telegram/config", response_model=TelegramConfig)
async def create_telegram_config(config_data: TelegramConfigCreate):
    """Create or update Telegram configuration"""
    existing_config = await get_telegram_config()
    
    if existing_config:
        # Update existing config
        existing_config.api_id = config_data.api_id
        existing_config.api_hash = config_data.api_hash
        existing_config.phone_number = config_data.phone_number
        existing_config.is_authenticated = False
        existing_config.session_string = None
        config = existing_config
    else:
        # Create new config
        config = TelegramConfig(**config_data.dict())
    
    await save_telegram_config(config)
    
    # Initialize client for testing
    await initialize_telegram_client()
    
    return config

@api_router.get("/telegram/config", response_model=Optional[TelegramConfig])
async def get_current_telegram_config():
    """Get current Telegram configuration"""
    config = await get_telegram_config()
    if config:
        # Don't return sensitive data
        config.api_hash = "***HIDDEN***"
        if config.session_string:
            config.session_string = "***HIDDEN***"
    return config

@api_router.put("/telegram/config", response_model=TelegramConfig)
async def update_telegram_config(config_update: TelegramConfigUpdate):
    """Update Telegram configuration"""
    config = await get_telegram_config()
    if not config:
        raise HTTPException(status_code=404, detail="Telegram configuration not found")
    
    update_data = config_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    if any([config_update.api_id, config_update.api_hash, config_update.phone_number]):
        config.is_authenticated = False
        config.session_string = None
    
    await save_telegram_config(config)
    await initialize_telegram_client()
    
    # Don't return sensitive data
    config.api_hash = "***HIDDEN***"
    if config.session_string:
        config.session_string = "***HIDDEN***"
    
    return config

# ========================== TELEGRAM AUTHENTICATION ==========================

@api_router.post("/telegram/send-code")
async def send_auth_code():
    """Send authentication code to phone number"""
    config = await get_telegram_config()
    if not config:
        raise HTTPException(status_code=404, detail="Telegram configuration not found")
    
    try:
        client = await initialize_telegram_client()
        if not client:
            raise HTTPException(status_code=400, detail="Failed to initialize Telegram client")
        
        await client.connect()
        sent_code = await client.send_code_request(config.phone_number)
        
        # Store phone_code_hash for later use with very extended timeout
        current_time = datetime.utcnow()
        await db.temp_auth.replace_one(
            {"phone_number": config.phone_number},
            {
                "phone_number": config.phone_number,
                "phone_code_hash": sent_code.phone_code_hash,
                "created_at": current_time,
                "expires_at": current_time + timedelta(minutes=30)  # Very extended timeout - 30 minutes
            },
            upsert=True
        )
        
        await client.disconnect()
        return {"message": "Authentication code sent successfully", "phone_code_hash": sent_code.phone_code_hash}
    
    except Exception as e:
        logging.error(f"Failed to send auth code: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to send auth code: {str(e)}")

@api_router.post("/telegram/verify-code")
async def verify_auth_code(auth_request: AuthRequest):
    """Verify authentication code and complete login"""
    config = await get_telegram_config()
    if not config:
        raise HTTPException(status_code=404, detail="Telegram configuration not found")
    
    # Get stored phone_code_hash with timeout check
    temp_auth = await db.temp_auth.find_one({"phone_number": config.phone_number})
    if not temp_auth:
        raise HTTPException(status_code=400, detail="No pending authentication found. Please request a new verification code.")
    
    # Check if temp_auth has expired (beyond our application timeout) with buffer
    current_time = datetime.utcnow()
    if 'expires_at' in temp_auth and temp_auth['expires_at'] < current_time:
        # Log the timing details for debugging
        logging.warning(f"Authentication expired - Current: {current_time}, Expires: {temp_auth['expires_at']}")
        # Clean up expired temp auth
        await db.temp_auth.delete_one({"phone_number": config.phone_number})
        raise HTTPException(status_code=400, detail="The verification session has expired. Please request a new verification code.")
    
    try:
        client = await initialize_telegram_client()
        if not client:
            raise HTTPException(status_code=400, detail="Failed to initialize Telegram client")
        
        await client.connect()
        
        try:
            # Use correct parameter order according to Telethon docs
            signed_in = await client.sign_in(
                config.phone_number,
                auth_request.phone_code,
                phone_code_hash=temp_auth['phone_code_hash']
            )
            
            # Get session string and save
            session_string = client.session.save()
            config.session_string = session_string
            config.is_authenticated = True
            await save_telegram_config(config)
            
            await client.disconnect()
            
            # Clean up temp auth after successful login
            await db.temp_auth.delete_one({"phone_number": config.phone_number})
            
            return {"message": "Authentication successful", "requires_2fa": False}
            
        except SessionPasswordNeededError:
            await client.disconnect()
            return {"message": "2FA password required", "requires_2fa": True}
        
        finally:
            # Ensure client is disconnected
            try:
                await client.disconnect()
            except:
                pass
    
    except PhoneCodeInvalidError as e:
        logging.error(f"Invalid phone code: {e}")
        # Don't clean up temp_auth for invalid code - allow retry
        raise HTTPException(status_code=400, detail="The verification code you entered is incorrect. Please check the code and try again.")
    except PhoneCodeExpiredError as e:
        logging.error(f"Expired phone code: {e}")
        # Clean up expired temp auth and force user to request new code
        await db.temp_auth.delete_one({"phone_number": config.phone_number})
        raise HTTPException(status_code=400, detail="The verification code has expired. Please request a new verification code to continue.")
    except Exception as e:
        logging.error(f"Failed to verify auth code: {e}")
        # For unknown errors, also clean up to force fresh start
        try:
            await db.temp_auth.delete_one({"phone_number": config.phone_number})
        except:
            pass
        raise HTTPException(status_code=400, detail="Authentication failed. Please request a new verification code and try again.")

@api_router.post("/telegram/verify-2fa")
async def verify_2fa_password(two_fa_auth: TwoFactorAuth):
    """Verify 2FA password"""
    config = await get_telegram_config()
    if not config:
        raise HTTPException(status_code=404, detail="Telegram configuration not found")
    
    try:
        client = await initialize_telegram_client()
        if not client:
            raise HTTPException(status_code=400, detail="Failed to initialize Telegram client")
        
        await client.connect()
        
        signed_in = await client.sign_in(password=two_fa_auth.password)
        
        # Get session string and save
        session_string = client.session.save()
        config.session_string = session_string
        config.is_authenticated = True
        await save_telegram_config(config)
        
        await client.disconnect()
        
        # Clean up temp auth
        await db.temp_auth.delete_one({"phone_number": config.phone_number})
        
        return {"message": "2FA authentication successful"}
    
    except PasswordHashInvalidError:
        raise HTTPException(status_code=400, detail="Invalid 2FA password")
    except Exception as e:
        logging.error(f"Failed to verify 2FA: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to verify 2FA: {str(e)}")

@api_router.get("/telegram/status")
async def get_telegram_status():
    """Get Telegram authentication status"""
    config = await get_telegram_config()
    if not config:
        return {"authenticated": False, "phone_number": None}
    
    return {
        "authenticated": config.is_authenticated,
        "phone_number": config.phone_number,
        "has_session": bool(config.session_string)
    }

# ========================== MESSAGE TEMPLATES ==========================

@api_router.post("/messages", response_model=MessageTemplate)
async def create_message_template(message_data: MessageTemplateCreate):
    """Create a new message template"""
    message = MessageTemplate(**message_data.dict())
    await db.message_templates.insert_one(message.dict())
    return message

@api_router.get("/messages", response_model=List[MessageTemplate])
async def get_message_templates():
    """Get all message templates"""
    messages = await db.message_templates.find().to_list(1000)
    return [MessageTemplate(**msg) for msg in messages]

@api_router.get("/messages/{message_id}", response_model=MessageTemplate)
async def get_message_template(message_id: str):
    """Get a specific message template"""
    message = await db.message_templates.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message template not found")
    return MessageTemplate(**message)

@api_router.put("/messages/{message_id}", response_model=MessageTemplate)
async def update_message_template(message_id: str, message_update: MessageTemplateUpdate):
    """Update a message template"""
    existing_message = await db.message_templates.find_one({"id": message_id})
    if not existing_message:
        raise HTTPException(status_code=404, detail="Message template not found")
    
    update_data = message_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.utcnow()
    
    await db.message_templates.update_one(
        {"id": message_id},
        {"$set": update_data}
    )
    
    updated_message = await db.message_templates.find_one({"id": message_id})
    return MessageTemplate(**updated_message)

@api_router.delete("/messages/{message_id}")
async def delete_message_template(message_id: str):
    """Delete a message template"""
    result = await db.message_templates.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message template not found")
    return {"message": "Message template deleted successfully"}

# ========================== GROUP TARGETS ==========================

@api_router.post("/groups", response_model=GroupTarget)
async def create_group_target(group_data: GroupTargetCreate):
    """Create a new group target"""
    parsed_info = parse_group_identifier(group_data.group_identifier)
    
    group = GroupTarget(
        group_identifier=group_data.group_identifier,
        parsed_name=parsed_info['name'],
        group_type=parsed_info['type'],
        is_active=group_data.is_active
    )
    await db.group_targets.insert_one(group.dict())
    return group

@api_router.post("/groups/bulk", response_model=List[GroupTarget])
async def create_bulk_group_targets(bulk_data: GroupBulkImport):
    """Create multiple group targets from bulk import"""
    created_groups = []
    
    for identifier in bulk_data.groups:
        if not identifier or not identifier.strip():
            continue
            
        try:
            parsed_info = parse_group_identifier(identifier.strip())
            
            # Check if group already exists
            existing = await db.group_targets.find_one({"group_identifier": identifier.strip()})
            if existing:
                continue
            
            group = GroupTarget(
                group_identifier=identifier.strip(),
                parsed_name=parsed_info['name'],
                group_type=parsed_info['type'],
                is_active=True
            )
            await db.group_targets.insert_one(group.dict())
            created_groups.append(group)
            
        except Exception as e:
            logging.error(f"Failed to create group {identifier}: {e}")
            continue
    
    return created_groups

@api_router.get("/groups", response_model=List[GroupTarget])
async def get_group_targets():
    """Get all group targets"""
    groups = await db.group_targets.find().to_list(1000)
    return [GroupTarget(**group) for group in groups]

@api_router.get("/groups/{group_id}", response_model=GroupTarget)
async def get_group_target(group_id: str):
    """Get a specific group target"""
    group = await db.group_targets.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group target not found")
    return GroupTarget(**group)

@api_router.put("/groups/{group_id}", response_model=GroupTarget)
async def update_group_target(group_id: str, group_update: GroupTargetUpdate):
    """Update a group target"""
    existing_group = await db.group_targets.find_one({"id": group_id})
    if not existing_group:
        raise HTTPException(status_code=404, detail="Group target not found")
    
    update_data = group_update.dict(exclude_unset=True)
    
    # If identifier is updated, reparse it
    if 'group_identifier' in update_data:
        parsed_info = parse_group_identifier(update_data['group_identifier'])
        update_data['parsed_name'] = parsed_info['name']
        update_data['group_type'] = parsed_info['type']
        update_data['resolved_id'] = None  # Reset resolved ID
    
    update_data['updated_at'] = datetime.utcnow()
    
    await db.group_targets.update_one(
        {"id": group_id},
        {"$set": update_data}
    )
    
    updated_group = await db.group_targets.find_one({"id": group_id})
    return GroupTarget(**updated_group)

@api_router.delete("/groups/{group_id}")
async def delete_group_target(group_id: str):
    """Delete a group target"""
    result = await db.group_targets.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group target not found")
    return {"message": "Group target deleted successfully"}

# ========================== BLACKLIST MANAGEMENT ==========================

@api_router.get("/blacklist", response_model=List[BlacklistEntry])
async def get_blacklist():
    """Get all blacklist entries"""
    blacklist = await db.blacklist.find().to_list(1000)
    return [BlacklistEntry(**entry) for entry in blacklist]

@api_router.post("/blacklist", response_model=BlacklistEntry)
async def create_blacklist_entry(blacklist_data: BlacklistEntryCreate):
    """Create a new blacklist entry"""
    blacklist_entry = BlacklistEntry(**blacklist_data.dict())
    await db.blacklist.insert_one(blacklist_entry.dict())
    return blacklist_entry

@api_router.delete("/blacklist/{entry_id}")
async def remove_blacklist_entry(entry_id: str):
    """Remove a blacklist entry"""
    result = await db.blacklist.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blacklist entry not found")
    return {"message": "Blacklist entry removed successfully"}

@api_router.post("/blacklist/cleanup")
async def cleanup_blacklist():
    """Clean up expired blacklist entries"""
    deleted_count = await cleanup_expired_blacklists()
    return {"message": f"Cleaned up {deleted_count} expired blacklist entries"}

# ========================== AUTOMATION CONFIGURATION ==========================

@api_router.get("/automation/config", response_model=AutomationConfig)
async def get_automation_configuration():
    """Get automation configuration"""
    return await get_automation_config()

@api_router.put("/automation/config", response_model=AutomationConfig)
async def update_automation_configuration(config_update: AutomationConfigUpdate):
    """Update automation configuration"""
    config = await get_automation_config()
    
    update_data = config_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(config, field, value)
    
    # Ensure blacklist cleanup is always enabled
    config.auto_cleanup_blacklist = True
    config.updated_at = datetime.utcnow()
    
    await db.automation_config.replace_one(
        {"id": config.id},
        config.dict(),
        upsert=True
    )
    
    return config

@api_router.get("/automation/status", response_model=AutomationStatus)
async def get_automation_status():
    """Get current automation status"""
    # This would be implemented with the actual automation engine
    status = AutomationStatus()
    return status

@api_router.post("/automation/start")
async def start_automation():
    """Start the automation process"""
    config = await get_automation_config()
    telegram_config = await get_telegram_config()
    
    if not telegram_config or not telegram_config.is_authenticated:
        raise HTTPException(status_code=400, detail="Telegram authentication required")
    
    config.is_active = True
    config.updated_at = datetime.utcnow()
    
    await db.automation_config.replace_one(
        {"id": config.id},
        config.dict(),
        upsert=True
    )
    
    return {"message": "Automation started successfully"}

@api_router.post("/automation/stop")
async def stop_automation():
    """Stop the automation process"""
    config = await get_automation_config()
    config.is_active = False
    config.updated_at = datetime.utcnow()
    
    await db.automation_config.replace_one(
        {"id": config.id},
        config.dict(),
        upsert=True
    )
    
    return {"message": "Automation stopped successfully"}

# ========================== LEGACY ENDPOINTS ==========================

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("Starting Telegram Automation System v2.0...")
    
    # Initialize indexes
    await db.telegram_config.create_index("id", unique=True)
    await db.message_templates.create_index("id", unique=True)
    await db.group_targets.create_index("id", unique=True)
    await db.blacklist.create_index("id", unique=True)
    await db.automation_config.create_index("id", unique=True)
    
    # Clean up expired blacklists on startup
    await cleanup_expired_blacklists()
    
    logger.info("Telegram Automation System v2.0 started successfully!")

@app.on_event("shutdown")
async def shutdown_db_client():
    """Clean up on shutdown"""
    # Disconnect all telegram clients
    for client in telegram_clients.values():
        if client.is_connected():
            await client.disconnect()
    
    client.close()
    logger.info("Telegram Automation System v2.0 shut down successfully!")