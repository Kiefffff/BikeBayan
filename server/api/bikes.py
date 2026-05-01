import os
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/bikes", tags=["hardware"])
logger = logging.getLogger(__name__)

class BikeUnlockRequest(BaseModel):
    station_id: int
    bike_id: int
    slot_number: int
    
    uin: int  
    name: str
    dob: str    
    location1: Optional[str] = None
    location3: Optional[str] = None
    zone: Optional[str] = None
    postal_code: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    address_line3: Optional[str] = None    

@router.post("/unlock")
async def confirm_unlock(req: BikeUnlockRequest):
    try:
        # 1. Log that the server successfully received and validated the JSON
        logger.info(f"SUCCESS: Valid JSON received from User {req.uin} for Bike {req.bike_id} at Station {req.station_id}")

        # 2. Bypass the database entirely and send the exact word "Truth" back to the ESP8266
        return PlainTextResponse("Truth")

    except Exception as e:
        logger.error(f"Failed to process unlock: {e}")
        raise HTTPException(status_code=500, detail="Server error.")