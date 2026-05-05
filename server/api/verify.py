# server/api/verify.py
import os
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mosip_auth_sdk.models import DemographicsModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf
from supabase import create_client, Client
from dotenv import load_dotenv

router = APIRouter(prefix="/verify", tags=["default"])

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
    email: str  # ✅ Email from user's registered account

@router.post("/verify")
async def verify_scan(req: VerifyRequest):
    """
    Called by ESP after National ID scan.
    
    Flow:
    1. User registered first at /register (has email + password in DB, uin=null)
    2. User logs in, goes to station, clicks "Borrow"
    3. ESP scans QR → extracts UIN, name, DOB
    4. ESP calls this endpoint with {uin, dob, name, email}
    5. Backend: MOSIP verify + lookup user by EMAIL + link UIN
    6. Returns success → ESP triggers OTP generation
    """
    try:
        uin = req.uin
        dob = req.dob
        name = req.name
        email = req.email

        logging.info(f"Verify scan: UIN={uin}, Email={email}")

        # 1. MOSIP demographic verification (uin + name + dob)
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
        logging.info(f"MOSIP Response: {data}")

        auth_status = data.get("response", {}).get("authStatus", False)
        if not auth_status:
            raise HTTPException(status_code=401, detail="MOSIP verification failed")

        # 2. Look up user by EMAIL (user registered first via /register)
        user_lookup = supabase.table("user").select("*").eq("email", email).execute()
        
        if not user_lookup.data:
            raise HTTPException(
                status_code=404, 
                detail="User not registered. Please create account at bikebayan.ph/register first"
            )
        
        user_data = user_lookup.data[0]
        
        # 3. Link UIN to user's account (if not already linked)
        if not user_data.get("uin"):
            supabase.table("user").update({
                "uin": int(uin),
                "linked_at": datetime.now().isoformat()
            }).eq("email", email).execute()
            logging.info(f"✅ Linked UIN {uin} to email {email}")
        elif str(user_data["uin"]) != uin:
            # Security: UIN mismatch
            logging.warning(f"⚠️ UIN mismatch: DB={user_data['uin']}, Scan={uin}")
            raise HTTPException(status_code=400, detail="UIN mismatch - contact support")

        # 4. Return success - ESP will now call generate-otp with this UIN
        return {
            "result": "Truth",
            "status": "verified",
            "uin": uin,
            "email": email,
            "message": "Identity verified. OTP will be sent to registered email."
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Verify scan failed: {e}")
        raise HTTPException(status_code=500, detail="Server error")