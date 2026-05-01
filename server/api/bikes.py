import os
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

router = APIRouter(prefix="/bikes", tags=["ESP Lock"])
logger = logging.getLogger(__name__)


class EspBorrowRequest(BaseModel):
    station_id: int
    bike_id: int
    slot_id: int
    uin: int 

class EspReturnRequest(BaseModel):
    station_id: int
    slot_id: int
    bike_id: int 
    # bike_rfid: str 
    uin: int 


@router.post("/borrow")
async def ESPborrow(req: EspBorrowRequest):
    try:
        user_check = supabase.table("user").select("status").eq("uin", req.uin).execute()
        if not user_check.data:
             raise HTTPException(status_code=404, detail="User not found.")
        if user_check.data[0].get("status") == "borrowing":
            logger.warning(f"SECURITY: User {req.uin} is already borrowing a bike.")
            raise HTTPException(status_code=403, detail="User is already borrowing a bike.")

        slot_check = supabase.table("slots").select("occupied_bike").eq("id", req.slot_id).execute()
        if not slot_check.data or slot_check.data[0].get("occupied_bike") != req.bike_id:
            logger.warning(f"Mismatch: Bike {req.bike_id} is not in Slot {req.slot_id}.")
            raise HTTPException(status_code=400, detail="Bike not found in specified slot.")
        
        bike_check = supabase.table("bikes").select("status").eq("id", req.bike_id).execute()
        if not bike_check.data or bike_check.data[0].get("status") != "available":
             raise HTTPException(status_code=400, detail="Bike is not available.")


        supabase.table("slots").update({"occupied_bike": None}).eq("id", req.slot_id).execute()
        
        supabase.table("bikes").update({"status": "in_use"}).eq("id", req.bike_id).execute()
        
        supabase.table("user").update({"status": "borrowing"}).eq("uin", req.uin).execute()
        
        rental_data = {
            "user_uin": req.uin,
            "bike_id": req.bike_id,
            "start_station_id": req.station_id,
            "start_time": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("rental").insert(rental_data).execute()

        logger.info(f"ESP BORROW SUCCESS: Unlocking Bike {req.bike_id} for User {req.uin}")
        return PlainTextResponse("unlock") 

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ESP BORROW failed: {e}")
        return PlainTextResponse("ERROR")


@router.post("/return")
async def ESPreturn(req: EspReturnRequest):
    try:

        bike_id = req.bike_id

        bike_status_check = supabase.table("bikes").select("status").eq("id", bike_id).execute()
        if not bike_status_check.data or bike_status_check.data[0].get("status") != "in_use":
            logger.warning(f"SECURITY: Attempted to return Bike {bike_id} but it is not currently 'in_use'.")
            raise HTTPException(status_code=400, detail="Bike is not currently marked as in use.")

        active_rental = supabase.table("rental").select("id") \
            .eq("user_uin", req.uin) \
            .eq("bike_id", bike_id) \
            .is_("end_time", "null").execute()
            
        if not active_rental.data:
            logger.warning(f"SECURITY: User {req.uin} tried to return Bike {bike_id} without an active rental.")
            raise HTTPException(status_code=403, detail="No active rental found.")
        rental_id = active_rental.data[0]['id']

        slot_check = supabase.table("slots").select("occupied_bike").eq("id", req.slot_id).execute()
        if not slot_check.data or slot_check.data[0].get("occupied_bike") is not None:
             raise HTTPException(status_code=400, detail="Target slot is already occupied.")

        supabase.table("rental").update({
            "end_time": datetime.now(timezone.utc).isoformat(),
            "end_station_id": req.station_id
        }).eq("id", rental_id).execute()

        supabase.table("slots").update({"occupied_bike": bike_id}).eq("id", req.slot_id).execute()

        supabase.table("bikes").update({"status": "available"}).eq("id", bike_id).execute()

        supabase.table("user").update({"status": "normal"}).eq("uin", req.uin).execute()

        logger.info(f"ESP RETURN SUCCESS: Bike {bike_id} returned to Slot {req.slot_id} by User {req.uin}")
        return PlainTextResponse("locked") 

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ESP RETURN failed: {e}")
        return PlainTextResponse("ERROR")