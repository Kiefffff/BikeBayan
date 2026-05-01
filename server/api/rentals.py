from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta

router = APIRouter(prefix="/api", tags=["rentals"])

class BorrowRequest(BaseModel):
    user_uin: int
    bike_id: int
    start_station_id: int

class ReturnRequest(BaseModel):
    user_uin: int
    bike_id: int
    end_station_id: int

# 1. ISHAN GET /api/stations (with available slots)
@router.get("/stations")
async def get_stations():
    pass

# 2. ISHAN GET /api/stations/{station_id}/bikes
@router.get("/stations/{station_id}/bikes")
async def get_station_bikes(station_id: int):
    pass

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
    pass