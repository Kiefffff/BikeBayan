import os
import logging
import asyncio
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi.responses import PlainTextResponse
router = APIRouter(prefix="", tags=["default"])

load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

MOCK_SERVER_URL = "https://cs145-iot-cup-1745973870.ap-southeast-1.elb.amazonaws.com"

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
        return await asyncio.wait_for(
            asyncio.to_thread(process_verification, req), 
            timeout=120
        )
    except asyncio.TimeoutError:
        logging.error("MOSIP API or Database took too long to respond.")
        return PlainTextResponse("-1")
    except HTTPException:
        return PlainTextResponse("-1")

def process_verification(req: VerifyRequest):
    try:
        uin = req.uin
        dob = req.dob
        name = req.name

        logging.info(f"Verify scan: UIN={uin}")

        # 1. Call KYC endpoint on the mock server
        response = requests.post(
            f"{MOCK_SERVER_URL}/api/v1/auth/kyc",
            json={
                "individual_id": uin,
                "consent": True,
                "name": name,
                "dob": dob,
            },
            verify=False,
        )

        kyc_response_body = response.json()

        # 2. Check for MOSIP errors
        if kyc_response_body.get("errors"):
            logging.error(f"MOSIP KYC Failed: {kyc_response_body['errors']}")
            raise HTTPException(status_code=401, detail="MOSIP verification failed")

        # 3. Decrypt and Extract the Data
        kyc_data = kyc_response_body.get("response", {})

        if not kyc_data.get("kycStatus"):
            logging.error("KYC status is false")
            raise HTTPException(status_code=401, detail="MOSIP verification failed")

        extracted_email = kyc_data.get("email")
        extracted_name = kyc_data.get("name_eng")

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

        return("Success")

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Verify scan failed: {e}")
        raise HTTPException(status_code=500, detail="Server error")