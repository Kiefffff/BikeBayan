import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["rentals"])


class BorrowRequest(BaseModel):
    user_uin: int
    bike_id: int
    slot_id: int
    start_station_id: int

class ReturnRequest(BaseModel):
    user_uin: int
    bike_id: int
    slot_id: int
    end_station_id: int

# 1. ISHAN GET /api/stations (with available slots)
@router.get("/stations")
async def get_stations():
    try:
        response = supabase.table("station").select("*").execute()
        return {"stations": response.data}
    except Exception as e:
        logger.error(f"Failed to fetch stations: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch stations")

# 2. ISHAN GET /api/stations/{station_id}/bikes
@router.get("/stations/{station_id}/bikes")
async def get_station_bikes(station_id: int):
    try:
        response = supabase.table("slots").select("*").eq("station_id", station_id).execute()
        slots = []
        for slot in response.data:
            if slot["occupied_bike"] not in [None, 0]:
                slots.append(slot["occupied_bike"])

        return {"bikes": slots}

    except Exception as e:
        logger.error(f"Failed to fetch bikes in station {station_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch stations")

# 3. ISHAN POST /api/rentals/borrow (Phase 1)
@router.post("/rentals/borrow", status_code=201)
async def borrow_bike(req: BorrowRequest):
    try:
        slot_check = supabase.table("slots").select("occupied_bike").eq("id", req.slot_id).execute()
        if not slot_check.data or slot_check.data[0].get("occupied_bike") != req.bike_id:
            raise HTTPException(status_code=400, detail="Bike is not in the specified slot.")

        supabase.table("slots").update({"occupied_bike": None}).eq("id", req.slot_id).execute()

        supabase.table("bikes").update({"status": "in_use"}).eq("id", req.bike_id).execute()
        supabase.table("user").update({"status": "Borrowing"}).eq("uin", req.user_uin).execute()
        rental_data = {
            "user_uin": req.user_uin,
            "bike_id": req.bike_id,
            "start_station_id": req.start_station_id,
            "start_time": datetime.now(timezone.utc).isoformat()
        }
        response = supabase.table("rental").insert(rental_data).execute()
        
        logger.info(f"User {req.user_uin} borrowed Bike {req.bike_id} from Slot {req.slot_id}")
        return {"message": "Borrow successful", "rental": response.data[0]}

    except HTTPException:
        raise 
    except Exception as e:
        logger.error(f"Borrow failed: {e}")
        raise HTTPException(status_code=500, detail="Server error during borrow process")


# 4. ISHAN POST /api/rentals/return (Phase 2)
@router.post("/rentals/return", status_code=200)
async def return_bike(req: ReturnRequest):
    try:
        active_rental = supabase.table("rental").select("id") \
            .eq("user_uin", req.user_uin) \
            .eq("bike_id", req.bike_id) \
            .is_("end_time", "null").execute()

        if not active_rental.data:
            raise HTTPException(status_code=400, detail="No active rental found for this user and bike.")
        rental_id = active_rental.data[0]['id']

        slot_check = supabase.table("slots").select("occupied_bike").eq("id", req.slot_id).execute()
        if not slot_check.data or slot_check.data[0].get("occupied_bike") is not None:
            raise HTTPException(status_code=400, detail="The destination slot is already full.")

        supabase.table("rental").update({
            "end_time": datetime.now(timezone.utc).isoformat(),
            "end_station_id": req.end_station_id
        }).eq("id", rental_id).execute()

        supabase.table("slots").update({"occupied_bike": req.bike_id}).eq("id", req.slot_id).execute()

        supabase.table("bikes").update({"status": "available"}).eq("id", req.bike_id).execute()

        supabase.table("user").update({"status": "Cleared"}).eq("uin", req.user_uin).execute()

        logger.info(f"User {req.user_uin} returned Bike {req.bike_id} to Slot {req.slot_id}")
        return {"message": "Return successful", "new_slot": req.slot_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Return failed: {e}")
        raise HTTPException(status_code=500, detail="Server error during return process")
# 5. ISHAN GET /api/users/{uin}/status
@router.get("/users/{uin}/status")
async def get_user_status(uin: int):
    try:
        response = supabase.table("user").select("*").eq("uin", uin).execute()
        return {"status": response.data[-1]["status"]}  
    except Exception as e:
        logger.error(f"Failed to fetch rental status for user {uin}: {e}")
        raise HTTPException(status_code=500, detail="user status")