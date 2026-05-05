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

@router.post("/verify")
async def verify_scan(req: VerifyRequest):
    """
    Called by ESP after National ID scan.
    Flow: ESP extracts UIN → MOSIP verify → Create/update user record → Return success
    """
    try:
        uin = req.uin
        dob = req.dob
        name = req.name

        logging.info(f"Verify scan: UIN={uin}")

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

        # 2. Create or update user record (no email needed)
        user = supabase.table("user").select("*").eq("uin", uin).execute()
        
        if not user.data:
            # New user
            supabase.table("user").insert({
                "uin": int(uin),
                "name": name,
                "status": "Cleared",
                "created_at": datetime.now().isoformat()
            }).execute()
            logging.info(f"✅ Created user for UIN={uin}")
        else:
            # Existing user - just update name if changed
            supabase.table("user").update({
                "name": name,
                "last_seen": datetime.now().isoformat()
            }).eq("uin", uin).execute()
            logging.info(f"✅ Updated user for UIN={uin}")

        return {
            "result": "Truth",
            "status": "verified",
            "uin": uin,
            "message": "Identity verified. Proceed to OTP."
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Verify scan failed: {e}")
        raise HTTPException(status_code=500, detail="Server error")