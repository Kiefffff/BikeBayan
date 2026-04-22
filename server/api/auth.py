from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf
import logging

router = APIRouter(prefix="/auth", tags=["authentication"])

# Initialize MOSIP 
def get_authenticator():
    config = Dynaconf(settings_files=["./config.toml"], environments=False)
    return MOSIPAuthenticator(config=config)

class OTPRequest(BaseModel):
    uin: str
    channel: str = "email"  # "email" or "sms"

class VerifyRequest(BaseModel):
    uin: str
    otp: str
    transaction_id: str

@router.post("/generate-otp")
async def generate_otp(req: OTPRequest):
    try:
        auth = get_authenticator()
        resp = auth.genotp(
            individual_id=req.uin,
            individual_id_type="UIN",
            email=(req.channel == "email"),
            phone=(req.channel == "sms")
        )
        data = resp.json()
        return {"success": True, "transaction_id": data["transactionID"]}
    except Exception as e:
        logging.error(f"OTP generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"MOSIP Error: {str(e)}")

@router.post("/verify-otp")
async def verify_otp(req: VerifyRequest):
    try:
        auth = get_authenticator()
        resp = auth.auth(
            individual_id=req.uin,
            individual_id_type="UIN",
            otp_value=req.otp,
            txn_id=req.transaction_id,
            consent=True
        )
        data = resp.json()
        auth_status = data.get("response", {}).get("authStatus", False)
        return {
            "success": auth_status,
            "auth_token": data["response"].get("authToken") if auth_status else None
        }
    except Exception as e:
        logging.error(f"OTP verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"MOSIP Error: {str(e)}")
