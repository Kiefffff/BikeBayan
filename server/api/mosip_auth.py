# server/api/mosip_auth.py
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
# from mosip_auth_sdk import MOSIPAuthenticator
# from dynaconf import Dynaconf
import logging
import os
import asyncio 
import requests
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

router = APIRouter(prefix="/auth", tags=["authentication"])

MOCK_SERVER_URL = "https://cs145-iot-cup-1745973870.ap-southeast-1.elb.amazonaws.com"

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


class OTPRequest(BaseModel):
    uin: str

class VerifyRequest(BaseModel):
    email: str
    otp: str


def _process_generate_otp(req: OTPRequest):
    resp = requests.post(
        f"{MOCK_SERVER_URL}/api/v1/auth/otp",
        json={
            "individual_id": req.uin,
            "email": True,
            "phone": False,
        },
        verify=False,
    )
    return resp.json()

def _process_verify_otp(req: VerifyRequest, uin: str, transaction_id: str):
    resp = requests.post(
        f"{MOCK_SERVER_URL}/api/v1/auth/yes-no",
        json={
            "individual_id": uin,
            "consent": True,
            "otp_value": req.otp,
            "txn_id": transaction_id,
        },
        verify=False,
    )
    return resp.json()


@router.post("/generate-otp")
async def generate_otp(req: OTPRequest):
    try:
        data = await asyncio.wait_for(
            asyncio.to_thread(_process_generate_otp, req),
            timeout=30.0  # 30 seconds timeout
        )

        if data.get("errors"):
            logger.error(f"OTP generation failed: {data['errors']}")
            return PlainTextResponse("-1")

        # Store transaction ID
        otp_transactions[req.uin] = data["transactionID"]
        esp_auth_status[req.uin] = False

        # Log OTP from mock data
        mock_otp = data["response"]["otp"]
        logger.info(f"MOCK OTP generated for UIN={req.uin} | [MOCK OTP]={mock_otp}")
        return PlainTextResponse("success")
        
    except asyncio.TimeoutError:
        logger.error(f"OTP generation timed out for UIN={req.uin}")
        return PlainTextResponse("-1")  # ESP-friendly error
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP generation failed: {e}")
        return PlainTextResponse("-1")

@router.post("/verify-otp")
async def verify_otp(req: VerifyRequest):
    try:
        user = supabase.table("user").select("uin").eq("email", req.email).execute()
        if not user.data:
            raise HTTPException(status_code=404, detail="User not found")
        uin = str(user.data[0]['uin'])
        
        transaction_id = otp_transactions.get(uin)
        if not transaction_id:
            raise HTTPException(status_code=400, detail="No OTP generated for this user")

        data = await asyncio.wait_for(
            asyncio.to_thread(_process_verify_otp, req, uin, transaction_id),
            timeout=30.0  # 30 seconds timeout
        )

        if data.get("errors"):
            logger.warning(f"OTP verification errors for UIN={uin}: {data['errors']}")
            return {"success": False}
            
        auth_status = data.get("response", {}).get("authStatus", False)

        if auth_status:
            otp_transactions.pop(uin, None)
            esp_auth_status[uin] = True
            
            # Ensure user exists in Supabase
            user_check = supabase.table("user").select("*").eq("uin", uin).execute()
            if not user_check.data:
                supabase.table("user").insert({
                    "uin": int(uin),
                    "status": "Cleared"
                }).execute()
                logger.info(f"Created user record for UIN={uin}")
            
            logger.info(f"OTP verified for UIN={uin}")
        else:
            logger.warning(f"OTP failed for UIN={uin}")

        return {"success": auth_status}
        
    except asyncio.TimeoutError:
        logger.error(f"OTP verification timed out for UIN={uin}")
        return {"success": False, "error": "timeout"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        return {"success": False, "error": str(e)}

@router.post("/check-status")
async def check_auth_status(req: OTPRequest):
    """
    ESP calls this endpoint repeatedly to check if the frontend successfully verified the OTP.
    """
    try:
        user = supabase.table("user").select("uin").eq("uin", req.uin).execute()
        if not user.data:
            raise HTTPException(status_code=400, detail="Invalid UIN")

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
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))