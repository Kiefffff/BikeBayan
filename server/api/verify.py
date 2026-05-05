
import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mosip_auth_sdk.models import DemographicsModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf
from supabase import create_client, Client
from dotenv import load_dotenv
from passlib.context import CryptContext

router = APIRouter(prefix="/verify", tags=["default"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def get_authenticator():
    config = Dynaconf(settings_files=["./config.toml"], environments=False)
    return MOSIPAuthenticator(config=config)

class VerifyRequest(BaseModel):
    uin: str
    dob: str
    name: str
    email: str

@router.post("/verify")
async def verify_scan(req: VerifyRequest):
    """Auto-create account with default password - NO setup token"""
    try:
        uin = req.uin
        dob = req.dob
        name = req.name
        email = req.email

        logging.info(f"Received: UIN={uin}, Email={email}")

        # 1. MOSIP demographic verification
        name_list = [{"language": "eng", "value": name}] if name else None
        demographics_data = DemographicsModel(name=name_list, dob=dob)

        authenticator = get_authenticator()
        response = authenticator.auth(
            individual_id=uin,
            individual_id_type="UIN",
            demographic_data=demographics_data,
            consent=True,
        )

        data = response.json()
        auth_status = data.get("response", {}).get("authStatus", False)
        if not auth_status:
            raise HTTPException(status_code=401, detail="MOSIP verification failed")

        # 2. Check if user already exists
        existing = supabase.table("user").select("*").eq("uin", uin).execute()
        if existing.
            return {
                "result": "Truth", 
                "status": "exists", 
                "message": "User already registered"
            }
        
        # 3. Generate simple default password (easy to type on LCD)
        default_password = "bike" + uin[-4:]  # e.g., "bike5308"
        hashed_password = pwd_context.hash(default_password)
        
        # 4. Auto-create account with default password
        supabase.table("user").insert({
            "uin": int(uin), 
            "name": name,
            "email": email,
            "password": hashed_password,  # ✅ Hashed default password
            "status": "Cleared",
            "created_at": datetime.now().isoformat(),
            "first_login": True  # Flag to prompt password change
        }).execute()
        
        logging.info(f"Account created for UIN={uin} with default password")
        
        # 5. Return default password for LCD display
        return {
            "result": "Truth", 
            "status": "created",
            "default_password": default_password,  # ✅ Show on LCD
            "message": "Account created. Login with email + temp password."
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Verification failed: {e}")
        raise HTTPException(status_code=500, detail="Server error")