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
            if slot["occupied_bike"] is not None:
                slots.append(slot["occupied_bike"])

        return {"bikes": slots}

    except Exception as e:
        logger.error(f"Failed to fetch bikes in station {station_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch stations")

# 3. ISHAN POST /api/rentals/borrow (Phase 1)
@router.post("/rentals/borrow", status_code=201)
async def borrow_bike(req: BorrowRequest):
    pass

# 4. ISHAN POST /api/rentals/return (Phase 2)
@router.post("/rentals/return", status_code=200)
async def return_bike(req: ReturnRequest):
    pass
# 5. ISHAN GET /api/users/{uin}/status
@router.get("/users/{uin}/status")
async def get_user_status(uin: int):
    try:
        response = supabase.table("user").select("*").eq("uin", uin).execute()
        return {"status": response.data[-1]["status"]}  
    except Exception as e:
        logger.error(f"Failed to fetch rental status for user {uin}: {e}")
        raise HTTPException(status_code=500, detail="user status")