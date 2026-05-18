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
router = APIRouter(tags=["rentals"])


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


# 1. GET /stations (Now includes docked_bikes list!)
@router.get("/stations")
async def get_stations():
    """
    Fetches all stations and calculates their capacity, available bikes, 
    AND which specific bikes are docked.
    """
    try:
        stations_res = supabase.table("station").select("*").execute()
        stations = stations_res.data

        slots_res = supabase.table("slots").select("station_id, occupied_bike").execute()
        slots = slots_res.data

        for station in stations:
            station_slots = [s for s in slots if str(s.get("station_id")) == str(station.get("id"))]
            station["total_capacity"] = len(station_slots)
            
            # 🚀 Collect the actual IDs of the bikes docked here
            docked_bikes = [
                s.get("occupied_bike") for s in station_slots 
                if s.get("occupied_bike") is not None and str(s.get("occupied_bike")) != "0"
            ]
            
            station["available_slots"] = len(docked_bikes)
            # Send the list of bikes to Next.js!
            station["docked_bikes"] = docked_bikes 

        return {"stations": stations}

    except Exception as e:
        logger.error(f"Failed to fetch stations: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch stations")


# 2. GET /stations/{station_id}/bikes
@router.get("/stations/{station_id}/bikes")
async def get_station_bikes(station_id: int):
    try:
        slots_response = supabase.table("slots") \
            .select("occupied_bike, id") \
            .eq("station_id", station_id) \
            .neq("occupied_bike", 0) \
            .execute()
            
        if not slots_response.data:
            return [] 

        bike_ids = [slot["occupied_bike"] for slot in slots_response.data if slot["occupied_bike"]]

        if not bike_ids:
            return []

        bikes_response = supabase.table("bikes") \
            .select("*") \
            .in_("id", bike_ids) \
            .execute()

        bikes = bikes_response.data
        for bike in bikes:
            matching_slot = next((slot for slot in slots_response.data if slot["occupied_bike"] == bike["id"]), None)
            if matching_slot:
                bike["slot_id"] = matching_slot["id"]

        return bikes

    except Exception as e:
        logger.error(f"Failed to fetch bikes for station {station_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch station bikes")


# 3. POST /rentals/borrow (Phase 1)
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


# 4. POST /rentals/return (Phase 2)
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


# 5. GET /users/{uin}/status 
@router.get("/users/{uin}/status")
async def get_user_status(uin: int):
    try:
        response = supabase.table("user").select("*").eq("uin", uin).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {"status": response.data[-1]["status"]}  
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch rental status for user {uin}: {e}")
        raise HTTPException(status_code=500, detail="Server error while checking user status")


# 6. 🚀 NEW: GET /rentals/active 
@router.get("/rentals/active")
async def get_active_rentals():
    """
    Fetches all bikes currently being rented by users.
    """
    try:
        # If end_time is null, it means the user hasn't returned it yet!
        response = supabase.table("rental").select("*").is_("end_time", "null").execute()
        return {"active_rentals": response.data}
    except Exception as e:
        logger.error(f"Failed to fetch active rentals: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch active rentals")

@router.get("/users/flagged")
async def get_flagged_users():
    """Fetches all users who currently have a 'Flagged' status."""
    try:
        response = supabase.table("user").select("*").eq("status", "Flagged").execute()
        return {"flagged_users": response.data}
    except Exception as e:
        logger.error(f"Failed to fetch flagged users: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch flagged users")

@router.post("/users/{uin}/clear")
async def clear_flagged_user(uin: int):
    try:
        # missing_bike_check = supabase.table("rental").select("id").eq(
        #     "user_uin", uin
        # ).is_("end_station_id", "null").execute()

        # if missing_bike_check.data:
        #     raise HTTPException(
        #         status_code=400, 
        #         detail="Cannot clear user: Their bike has not been returned to a station yet."
        #     )
            
        response = supabase.table("user").update({"status": "Cleared"}).eq("uin", uin).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        logger.info(f"Admin manually cleared User {uin}.")
        return {"message": f"User {uin} successfully cleared."}
        
    except HTTPException:
        raise 
    except Exception as e:
        logger.error(f"Failed to clear user {uin}: {e}")
        raise HTTPException(status_code=500, detail="Could not clear user")