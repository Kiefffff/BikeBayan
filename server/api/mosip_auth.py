from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf
import logging

router = APIRouter(prefix="/auth", tags=["authentication"])

# Configure the logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("logs/app.log"), # This creates the file
        logging.StreamHandler()              # This still prints to your terminal
    ]
)

logger = logging.getLogger(__name__)
logger.info("Logger initialized and exporting to logs/app.log")

def verify_user(user_data):
    logger.info(f"Attempting to verify user: {user_data.get('email')}")
    
    try:
        # Your Supabase logic here
        logger.info("User successfully verified.")
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")

# Initialize MOSIP globally so it only loads config.toml once
config = Dynaconf(settings_files=["./config.toml"], environments=False)
auth_instance = MOSIPAuthenticator(config=config)

def get_authenticator():
    return auth_instance

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
        
        # FIX: Changed inner double quotes to single quotes
        logger.info(f"Generating OTP for user: UIN={req.uin}, transactionID={data['transactionID']}")
        
        print(data["transactionID"])
        print(data)
        return {"success": True, "transaction_id": data["transactionID"]}
    except Exception as e:
        logger.error(f"OTP generation failed: {e}")
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
        print(data)
        auth_status = data.get("response", {}).get("authStatus", False)
        
        if auth_status:
            # FIX: Changed inner double quotes to single quotes
            logger.info(f"Verifying OTP for user: UIN={req.uin}, transactionID={data['transactionID']}")
        else:
            # FIX: Changed inner double quotes to single quotes
            logger.info(f"Failed OTP for user: UIN={req.uin}, transactionID={data['transactionID']}")
            
        return {
            "success": auth_status,
            "auth_token": data["response"].get("authToken") if auth_status else None
        }
    except Exception as e:
        logger.error(f"OTP verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"MOSIP Error: {str(e)}")