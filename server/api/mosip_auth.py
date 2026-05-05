from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf
import logging
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

router = APIRouter(prefix="/auth", tags=["authentication"])

# Dictionary to hold the transaction IDs
otp_transactions: dict[str, str] = {}
# Dictionary to hold the success status for the ESP to check
esp_auth_status: dict[str, bool] = {}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

config = Dynaconf(settings_files=["./config.toml"], environments=False)
auth_instance = MOSIPAuthenticator(config=config)

def get_authenticator():
    return auth_instance

class OTPRequest(BaseModel):
    uin: str

class VerifyRequest(BaseModel):
    uin: str
    otp: str

@router.post("/generate-otp")
async def generate_otp(req: OTPRequest):
    try:
        auth = get_authenticator()
        resp = auth.genotp(
            individual_id=req.uin,
            individual_id_type="UIN",
            email=True,
            phone=False,
        )
        
        data = resp.json()
        
        # Store transaction ID
        otp_transactions[req.uin] = data["transactionID"]
        
        # Set the ESP status to False (Pending)
        esp_auth_status[req.uin] = False
        
        logger.info(f"OTP generated for UIN={req.uin}")
        return {"success": True, "transaction_id": data["transactionID"]}
    except Exception as e:
        logger.error(f"OTP generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-otp")
async def verify_otp(req: VerifyRequest):
    try:
        uin = req.uin
        
        transaction_id = otp_transactions.get(uin)
        if not transaction_id:
            raise HTTPException(status_code=400, detail="No OTP generated for this user")

        auth = get_authenticator()
        resp = auth.auth(
            individual_id=uin,
            individual_id_type="UIN",
            otp_value=req.otp,
            txn_id=transaction_id,
            consent=True
        )
        data = resp.json()
        auth_status = data.get("response", {}).get("authStatus", False)

        if auth_status:
            # Clean up the transaction
            otp_transactions.pop(uin, None)
            
            # MARK AS TRUE FOR THE ESP TO SEE
            esp_auth_status[uin] = True
            
            # Ensure user exists in Supabase
            user = supabase.table("user").select("*").eq("uin", uin).execute()
            if not user.data:
                supabase.table("user").insert({
                    "uin": int(uin),
                    "status": "Cleared"
                }).execute()
                logger.info(f"Created user record for UIN={uin}")
            
            logger.info(f"OTP verified for UIN={uin}")
        else:
            logger.warning(f"OTP failed for UIN={uin}")

        return {"success": auth_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/check-status")
async def check_auth_status(req: OTPRequest):
    """
    ESP calls this endpoint repeatedly to check if the frontend successfully verified the OTP.
    """
    try:
        uin = req.uin
        if uin not in esp_auth_status:
            return PlainTextResponse("no active session")

        is_verified = esp_auth_status[uin]
        if is_verified:
            esp_auth_status.pop(uin, None)
            return PlainTextResponse("success")
        else:
            return PlainTextResponse("pending")
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
