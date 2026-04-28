import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mosip_auth_sdk.models import DemographicsModel
from mosip_auth_sdk import MOSIPAuthenticator
from dynaconf import Dynaconf
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

router = APIRouter()


# load .env
load_dotenv()

# setup 
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Lazy init — avoids loading certs at import time (startup crash/warnings)
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
    try:
        uin = req.uin
        dob = req.dob
        name = req.name
        email = req.email

        logging.info(f"Received data: UIN={uin}, DOB={dob}, Name={name}")

        name_list = [{"language": "eng", "value": name}] if name else None
        demographics_data = DemographicsModel(
            name=name_list,
            dob=dob
        )

        authenticator = get_authenticator()
        response = authenticator.auth(
            individual_id=uin,
            individual_id_type="UIN",
            demographic_data=demographics_data,
            consent=True,
        )

        data = response.json()
        logging.info(f"MOSIP Response: {data}")

        # Explicitly check authStatus instead of blindly returning "Truth"
        auth_status = data.get("response", {}).get("authStatus", False)
        if not auth_status:
            raise HTTPException(status_code=401, detail="False")

        response2 = supabase.table("user") \
        .select("name") \
        .eq("uin", uin) \
        .execute()

        # already enrolled/in the database
        if response2.data:
            print("exists")
            return {"result": "Truth"}
        # adding to database if they are not
        try:
            # Push data to the 'user' table
            
            print("doesnt")
            response = supabase.table("user").insert({
                "uin": int(uin), 
                "name": name,
                "email": email
            }).execute()
            return {"result": "Truth"}

        except Exception as e:
            logging.error(f"Enrollment to server failed: {e}")
            raise HTTPException(status_code=500, detail="False")


    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Authentication failed or error occurred: {e}")
        raise HTTPException(status_code=500, detail="False")