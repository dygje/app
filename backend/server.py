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

class UserProfile(BaseModel):
    user_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    username: Optional[str] = None
    is_verified: Optional[bool] = False
    is_premium: Optional[bool] = False
    is_bot: Optional[bool] = False

class TelegramConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    api_id: int
    api_hash: str
    phone_number: str
    session_string: Optional[str] = None
    is_authenticated: bool = False
    user_profile: Optional[UserProfile] = None  # Add user profile info
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

# ========================== HELPER FUNCTIONS ==========================

async def fetch_user_profile(client: TelegramClient) -> UserProfile:
    """Fetch user profile information from Telegram"""
    try:
        me = await client.get_me()
        return UserProfile(
            user_id=me.id,
            first_name=me.first_name,
            last_name=me.last_name,
            username=me.username,
            is_verified=getattr(me, 'verified', False),
            is_premium=getattr(me, 'premium', False),
            is_bot=getattr(me, 'bot', False)
        )
    except Exception as e:
        logging.warning(f"Failed to fetch user profile: {e}")
        return UserProfile()  # Return empty profile on error

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

async def initialize_telegram_client(session_string: Optional[str] = None) -> Optional[TelegramClient]:
    """Initialize Telegram client with current config and optional session"""
    config = await get_telegram_config()
    if not config or not config.api_id or not config.api_hash:
        return None
    
    try:
        # Use provided session_string, or fallback to config session, or create new
        if session_string:
            session = StringSession(session_string)
        elif config.session_string:
            session = StringSession(config.session_string)
        else:
            session = StringSession()
        
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
        logging.info(f"Telethon client connected for phone: {config.phone_number}")
        
        sent_code = await client.send_code_request(config.phone_number)
        logging.info(f"SMS code sent successfully, phone_code_hash: {sent_code.phone_code_hash[:10]}...")
        
        # Get session string to persist for verify-code endpoint
        session_string = client.session.save()
        logging.info(f"Session string saved for continuity: {session_string[:20]}...")
        
        # Store phone_code_hash AND session_string for later use
        current_time = datetime.utcnow()
        logging.info(f"Storing temp_auth with session for phone: {config.phone_number}")
        
        result = await db.temp_auth.replace_one(
            {"phone_number": config.phone_number},
            {
                "phone_number": config.phone_number,
                "phone_code_hash": sent_code.phone_code_hash,
                "session_string": session_string,  # Critical: store session for continuity
                "created_at": current_time,
                "expires_at": current_time + timedelta(minutes=30)  # Very extended timeout - 30 minutes
            },
            upsert=True
        )
        logging.info(f"Database write result: matched={result.matched_count}, modified={result.modified_count}, upserted={result.upserted_id}")
        
        await client.disconnect()
        logging.info(f"Authentication code sent successfully for phone: {config.phone_number}")
        return {"message": "Authentication code sent successfully", "phone_code_hash": sent_code.phone_code_hash}
    
    except Exception as e:
        logging.error(f"Failed to send auth code: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to send auth code: {str(e)}")

@api_router.post("/telegram/verify-code")
async def verify_auth_code(auth_request: AuthRequest):
    """Verify authentication code and complete login"""
    logging.info(f"Starting verification for code: {auth_request.phone_code[:3]}***")
    
    config = await get_telegram_config()
    if not config:
        raise HTTPException(status_code=404, detail="Telegram configuration not found")
    
    # Get stored phone_code_hash with timeout check
    temp_auth = await db.temp_auth.find_one({"phone_number": config.phone_number})
    if not temp_auth:
        logging.warning(f"No temp_auth found for phone: {config.phone_number}")
        raise HTTPException(status_code=400, detail="No pending authentication found. Please request a new verification code.")
    
    # Log temp_auth details for debugging
    logging.info(f"Found temp_auth - Created: {temp_auth.get('created_at')}, Expires: {temp_auth.get('expires_at')}")
    
    # Check if temp_auth has expired (beyond our application timeout) with buffer
    current_time = datetime.utcnow()
    if 'expires_at' in temp_auth and temp_auth['expires_at'] < current_time:
        # Log the timing details for debugging
        logging.warning(f"Authentication expired - Current: {current_time}, Expires: {temp_auth['expires_at']}")
        # Clean up expired temp auth
        await db.temp_auth.delete_one({"phone_number": config.phone_number})
        raise HTTPException(status_code=400, detail="The verification session has expired. Please request a new verification code.")
    
    try:
        # Use the SAME session from send-code to maintain continuity
        session_string = temp_auth.get('session_string')
        if not session_string:
            logging.error("No session_string found in temp_auth - session continuity broken")
            raise HTTPException(status_code=400, detail="Authentication session invalid. Please request a new verification code.")
        
        logging.info(f"Using stored session for continuity: {session_string[:20]}...")
        client = await initialize_telegram_client(session_string=session_string)
        if not client:
            raise HTTPException(status_code=400, detail="Failed to initialize Telegram client with session")
        
        await client.connect()
        logging.info(f"Client connected with stored session for phone: {config.phone_number}")
        
        try:
            # Use correct parameter order according to Telethon docs with session continuity
            logging.info(f"Attempting sign_in with phone_code_hash: {temp_auth['phone_code_hash'][:10]}...")
            signed_in = await client.sign_in(
                config.phone_number,
                auth_request.phone_code,
                phone_code_hash=temp_auth['phone_code_hash']
            )
            logging.info(f"Sign-in successful for phone: {config.phone_number}")
            
            # Fetch user profile information
            user_profile = await fetch_user_profile(client)
            logging.info(f"Fetched user profile: {user_profile.first_name} (@{user_profile.username})")
            
            # Get session string and save with user profile
            session_string = client.session.save()
            config.session_string = session_string
            config.is_authenticated = True
            config.user_profile = user_profile
            config.updated_at = datetime.utcnow()
            await save_telegram_config(config)
            
            await client.disconnect()
            
            # Clean up temp auth after successful login
            await db.temp_auth.delete_one({"phone_number": config.phone_number})
            
            return {"message": "Authentication successful", "requires_2fa": False}
            
        except SessionPasswordNeededError:
            # Don't disconnect - we need to maintain the session for 2FA
            logging.info(f"2FA required for phone: {config.phone_number} - keeping session alive")
            
            # Update temp_auth to indicate 2FA state and keep client session
            current_time = datetime.utcnow()
            await db.temp_auth.update_one(
                {"phone_number": config.phone_number},
                {
                    "$set": {
                        "requires_2fa": True,
                        "session_string": client.session.save(),  # Update with current session state
                        "updated_at": current_time
                    }
                }
            )
            
            # Disconnect only after saving the proper state
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
    """Verify 2FA password with session continuity"""
    logging.info(f"Starting 2FA verification")
    
    config = await get_telegram_config()
    if not config:
        raise HTTPException(status_code=404, detail="Telegram configuration not found")
    
    # Get stored session from temp_auth for continuity
    temp_auth = await db.temp_auth.find_one({"phone_number": config.phone_number})
    if not temp_auth or not temp_auth.get('session_string'):
        logging.error("No session_string found for 2FA - session continuity broken")
        raise HTTPException(status_code=400, detail="Authentication session invalid. Please restart authentication process.")
    
    # Verify this is actually a 2FA state
    if not temp_auth.get('requires_2fa'):
        logging.error("2FA not required for this session")
        raise HTTPException(status_code=400, detail="2FA not required. Please complete phone verification first.")
    
    try:
        # Use the SAME session from verify-code step that's in 2FA state
        session_string = temp_auth['session_string']
        logging.info(f"Using 2FA session for password verification: {session_string[:20]}...")
        
        client = await initialize_telegram_client(session_string=session_string)
        if not client:
            raise HTTPException(status_code=400, detail="Failed to initialize Telegram client with 2FA session")
        
        await client.connect()
        logging.info(f"Client connected with 2FA session for phone: {config.phone_number}")
        
        # Complete 2FA authentication - client should be in password-needed state
        logging.info(f"Attempting 2FA password verification...")
        signed_in = await client.sign_in(password=two_fa_auth.password)
        logging.info(f"2FA authentication successful!")
        
        # Fetch user profile information
        user_profile = await fetch_user_profile(client)
        logging.info(f"Fetched user profile: {user_profile.first_name} (@{user_profile.username})")
        
        # Get session string and save with user profile
        session_string = client.session.save()
        config.session_string = session_string
        config.is_authenticated = True
        config.user_profile = user_profile
        config.updated_at = datetime.utcnow()
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

@api_router.post("/telegram/logout")
async def logout_telegram():
    """Logout from Telegram and clear session data"""
    try:
        # Get current config
        config = await get_telegram_config()
        if not config:
            return {"message": "No active session found"}
        
        # Disconnect and clean up active client if exists
        client_key = f"{config.api_id}_{config.phone_number}"
        if client_key in telegram_clients:
            client = telegram_clients[client_key]
            try:
                if client.is_connected():
                    await client.disconnect()
                del telegram_clients[client_key]
                logging.info(f"Disconnected and removed client for {config.phone_number}")
            except Exception as e:
                logging.warning(f"Error disconnecting client: {e}")
        
        # Clear session data in database
        await db.telegram_config.update_one(
            {"phone_number": config.phone_number},
            {
                "$set": {
                    "session_string": None,
                    "is_authenticated": False,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Clean up temporary auth data if exists
        await db.temp_auth.delete_many({"phone_number": config.phone_number})
        
        logging.info(f"Successfully logged out user {config.phone_number}")
        return {"message": "Successfully logged out from Telegram"}
        
    except Exception as e:
        logging.error(f"Error during logout: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to logout: {str(e)}")

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