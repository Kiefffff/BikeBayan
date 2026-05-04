# server/api/verify.py
import os
import logging
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mosip_auth_sdk.models import DemographicsModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf
from supabase import create_client, Client
from dotenv import load_dotenv
from passlib.context import CryptContext

router = APIRouter(prefix="/verify", tags=["default"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Setup tokens: token -> {uin, email, expires_at}
setup_tokens: dict[str, dict] = {}

# Load env
load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Lazy init MOSIP
def get_authenticator():
    config = Dynaconf(settings_files=["./config.toml"], environments=False)
    return MOSIPAuthenticator(config=config)

# Request models
class VerifyRequest(BaseModel):
    uin: str
    dob: str
    name: str
    email: str  # ✅ Added email field

class SetupPasswordRequest(BaseModel):
    token: str
    password: str

@router.post("/verify")
async def verify_scan(req: VerifyRequest):
    """Called by ESP after QR scan - verifies identity + auto-creates account"""
    try:
        uin = req.uin
        dob = req.dob
        name = req.name
        email = req.email  # ✅ Now defined

        logging.info(f"Received: UIN={uin}, DOB={dob}, Name={name}, Email={email}")

        # 1. MOSIP demographic verification
        name_list = [{"language": "eng", "value": name}] if name else None
        demographics_data = DemographicsModel(
            name=name_list,
            dob=dob
        )

        authenticator = get_authenticator()
        response = authenticator.auth(
            individual_id=uin,
            individual_id_type="UIN",
            demographic_data=demographics_data,
            consent=True,
        )

        data = response.json()
        logging.info(f"MOSIP Response: {data}")

        auth_status = data.get("response", {}).get("authStatus", False)
        if not auth_status:
            raise HTTPException(status_code=401, detail="MOSIP verification failed")

        # 2. Check if user already exists
        existing_user = supabase.table("user").select("*").eq("uin", uin).execute()
        
        if existing_user.data:
            # User exists - return success
            return {
                "result": "Truth", 
                "status": "exists", 
                "message": "User already registered"
            }
        
        # 3. Auto-create account (password not set yet)
        supabase.table("user").insert({
            "uin": int(uin), 
            "name": name,
            "email": email,  # ✅ Fixed: was undefined variable
            "password": None,  # Not set yet - user will set via /setup-password
            "status": "Cleared",
            "created_at": datetime.now().isoformat()
        }).execute()
        
        # 4. Generate setup token (8-char code, valid 30 mins)
        setup_token = secrets.token_urlsafe(6)
        setup_tokens[setup_token] = {
            "uin": uin,
            "email": email,
            "expires_at": datetime.now() + timedelta(minutes=30)
        }
        
        logging.info(f"Account created for UIN={uin}, setup token={setup_token}")
        
        return {
            "result": "Truth", 
            "status": "created",
            "setup_token": setup_token,  # ✅ Return token for password setup
            "message": "Account created. Set password at bikebayan.ph/setup"
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Authentication/Enrollment failed: {e}")
        raise HTTPException(status_code=500, detail="Server error")

@router.post("/setup-password")
async def setup_password(req: SetupPasswordRequest):
    """User sets password after first scan using setup token"""
    try:
        # Validate token
        token_data = setup_tokens.get(req.token)
        
        if not token_data:
            raise HTTPException(status_code=400, detail="Invalid or expired token")
        
        if datetime.now() > token_data["expires_at"]:
            del setup_tokens[req.token]
            raise HTTPException(status_code=400, detail="Token expired. Please scan ID again.")
        
        uin = token_data["uin"]
        email = token_data["email"]
        
        # Hash password
        hashed_password = pwd_context.hash(req.password)
        
        # Update user record with password
        supabase.table("user").update({
            "password": hashed_password,
            "password_set_at": datetime.now().isoformat()
        }).eq("uin", uin).execute()
        
        # Clean up used token
        del setup_tokens[req.token]
        
        logging.info(f"Password set for UIN={uin}")
        
        return {
            "success": True,
            "message": "Password set successfully. You can now login."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Password setup failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to set password")