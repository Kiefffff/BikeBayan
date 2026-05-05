import os
import logging
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
    Flow: ESP extracts UIN → MOSIP verify → Decrypt KYC → Create/update user record → Return success
    """
    try:
        uin = req.uin
        dob = req.dob
        name = req.name

        logging.info(f"Verify scan: UIN={uin}")

        # 1. Package demographics data for Demo Auth
        name_list = [{"language": "eng", "value": name}] if name else None
        demographics_data = DemographicsModel(name=name_list, dob=dob)

        authenticator = get_authenticator()

        # 2. Call KYC instead of standard Auth
        response = authenticator.kyc(
            individual_id=uin,
            individual_id_type="UIN",
            demographic_data=demographics_data,
            consent=True,
        )

        kyc_response_body = response.json()

        # Check for MOSIP errors
        if "errors" in kyc_response_body and kyc_response_body["errors"]:
            logging.error(f"MOSIP KYC Failed: {kyc_response_body['errors']}")
            raise HTTPException(status_code=401, detail="MOSIP verification failed")

        # 3. Decrypt and Extract the Data
        decrypted_response = authenticator.decrypt_response(kyc_response_body)

        extracted_email = decrypted_response.get("email") or decrypted_response.get("emailId")
        extracted_name = decrypted_response.get("name_eng")

        # Fallback for name based on standard multi-language list just in case the policy format changes later
        raw_name = decrypted_response.get("name")
        if not extracted_name:
            if isinstance(raw_name, list) and len(raw_name) > 0:
                extracted_name = raw_name[0].get("value")
            elif isinstance(raw_name, str):
                extracted_name = raw_name

        # Use MOSIP verified name if available, otherwise fallback to the physical scanned name
        final_name = extracted_name if extracted_name else name

        # 4. Create or update user record in Supabase
        user = supabase.table("user").select("*").eq("uin", uin).execute()
        
        if not user.data:
            # New user
            supabase.table("user").insert({
                "uin": int(uin),
                "name": final_name,
                "email": extracted_email,
                "status": "Cleared",
            }).execute()
            logging.info(f"Created user for UIN={uin} with email={extracted_email}")
        else:
            # Existing user - update name and email[cite: 1]
            supabase.table("user").update({
                "name": final_name,
                "email": extracted_email,
            }).eq("uin", uin).execute()
            logging.info(f"Updated user for UIN={uin} with email={extracted_email}")

        return {
            "result": "Truth",
            "status": "verified",
            "uin": uin,
            "message": "Identity verified and data extracted."
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Verify scan failed: {e}")
        raise HTTPException(status_code=500, detail="Server error")