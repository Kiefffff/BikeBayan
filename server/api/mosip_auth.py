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
otp_transactions: dict[str, str] = {}

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
    channel: str = "email"

class VerifyRequest(BaseModel):
    email: str
    otp: str

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
        
        # FOR DEBUGGING TO CHECK Log FULL response
        logger.info("=" * 50)
        logger.info("MOSIP FULL RESPONSE:")
        logger.info(f"Raw data: {data}")
        logger.info(f"Keys in response: {data.keys()}")
        if "response" in data:
            logger.info(f"Response keys: {data['response'].keys()}")
            logger.info(f"Email field: {data['response'].get('email')}")
            logger.info(f"Phone field: {data['response'].get('phone')}")
        logger.info("=" * 50)
        
        otp_transactions[req.uin] = data["transactionID"]
        logger.info(f"OTP generated for UIN={req.uin}")
        return {"success": True, "transaction_id": data["transactionID"]}
    except Exception as e:
        logger.error(f"OTP generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify-otp")
async def verify_otp(req: VerifyRequest):
    try:
        user_lookup = supabase.table("user").select("uin").eq("email", req.email).execute()
        if not user_lookup.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        uin = str(user_lookup.data[0]['uin'])
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
            otp_transactions.pop(uin, None)
            
        return {"success": auth_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))