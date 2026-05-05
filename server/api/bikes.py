import os
import logging
from fastapi import APIRouter
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

class EspStationUpdateRequest(BaseModel):
    station_id: int
    slots: dict[str, int | None]

class EspUserStatusRequest(BaseModel):
    uin: int

class EspBorrowRequest(BaseModel):
    uin: int
    bike_id: int
    station_id: int | None = None

class EspUserBikeCheckRequest(BaseModel):
    uin: int
    rfid: str

class EspReturnedRequest(BaseModel):
    uin: int
    station_id: int | None = None


@router.post("/station-update")
async def station_update(req: EspStationUpdateRequest):
    try:
        for slot_id_str, bike_id in req.slots.items():
            slot_id = int(slot_id_str)
            
            slot_lookup = supabase.table("slots").select("id").eq(
                "station_id", req.station_id
            ).eq("id", slot_id).execute()

            if not slot_lookup.data:
                continue 

            supabase.table("slots").update({"occupied_bike": bike_id}).eq(
                "id", slot_id
            ).execute()

        return PlainTextResponse("1")
    except Exception as e:
        logger.error(f"Station Update failed: {e}")
        return PlainTextResponse("-1")


@router.post("/user-status")
async def user_status_check(req: EspUserStatusRequest):
    try:
        user_check = supabase.table("user").select("status").eq(
            "uin", req.uin
        ).execute()

        if not user_check.data:
            return PlainTextResponse("-1")

        status = user_check.data[0].get("status")

        if status == "Cleared":
            return PlainTextResponse("Cleared")
        elif status == "Borrowing":
            return PlainTextResponse("Borrowing")
        else:
            return PlainTextResponse("-1")
    except Exception as e:
        logger.error(f"User Status Check failed: {e}")
        return PlainTextResponse("-1")


@router.post("/set-borrowing")
async def set_user_borrowing(req: EspBorrowRequest):
    try:
        supabase.table("bikes").update({"status": "in_use"}).eq(
            "id", req.bike_id
        ).execute()
        
        supabase.table("user").update({"status": "Borrowing"}).eq(
            "uin", req.uin
        ).execute()

        rental_data = {
            "user_uin": req.uin,
            "bike_id": req.bike_id,
            "start_station_id": req.station_id,
            "start_time": datetime.now(timezone.utc).isoformat()
        }
        supabase.table("rental").insert(rental_data).execute()

        return PlainTextResponse("1")
    except Exception as e:
        logger.error(f"Set Borrowing failed: {e}")
        return PlainTextResponse("-1")


@router.post("/user-bike-check")
async def user_bike_check(req: EspUserBikeCheckRequest):
    try:
        bike_lookup = supabase.table("bikes").select("id").eq(
            "rfid", req.rfid
        ).execute()

        if not bike_lookup.data:
            return PlainTextResponse("-1")

        rfid_bike_id = bike_lookup.data[0]['id']

        active_rental = supabase.table("rental").select("bike_id").eq(
            "user_uin", req.uin
        ).is_("end_time", None).execute()

        if not active_rental.data:
            return PlainTextResponse("-1")

        rented_bike_id = active_rental.data[0]['bike_id']

        if rfid_bike_id != rented_bike_id:
            return PlainTextResponse("-1")

        return PlainTextResponse(str(rfid_bike_id))
    except Exception as e:
        logger.error(f"User Bike Check failed: {e}")
        return PlainTextResponse("-1")


@router.post("/set-returned")
async def set_user_returned(req: EspReturnedRequest):
    try:
        active_rental = supabase.table("rental").select("id", "bike_id").eq(
            "user_uin", req.uin
        ).is_("end_time", None).execute()

        if not active_rental.data:
            return PlainTextResponse("-1")

        rental_id = active_rental.data[0]['id']
        bike_id = active_rental.data[0]['bike_id']

        supabase.table("rental").update({
            "end_time": datetime.now(timezone.utc).isoformat(),
            "end_station_id": req.station_id
        }).eq("id", rental_id).execute()

        supabase.table("bikes").update({"status": "available"}).eq(
            "id", bike_id
        ).execute()
        
        supabase.table("user").update({"status": "Cleared"}).eq(
            "uin", req.uin
        ).execute()

        return PlainTextResponse("1")
    except Exception as e:
        logger.error(f"Set Cleared failed: {e}")
        return PlainTextResponse("-1")