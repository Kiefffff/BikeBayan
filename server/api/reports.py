import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["reports"])


class SubmitReport(BaseModel):
    email: str
    body: str

class UpdateReport(BaseModel):
    rental_id: int
    email: str
    body: str
    resolved: bool


@router.get("/reports")
async def get_reports():
    try:
        response = supabase.table("reports").select("*").execute()
        return {"reports": response.data}
    except Exception as e:
        logger.error(f"Failed to fetch reports: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch reports")

@router.get("/reports/{report_id}")
async def get_report(report_id: int):
    try:
        response = (
            supabase.table("reports")
            .select("*")
            .eq("id", report_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"report": response.data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch report {report_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch report")

@router.post("/reports/submit", status_code=201)
async def submit_report(req: SubmitReport):
    try:
        # resolve email to uin
        user = (
            supabase.table("user")
            .select("uin")
            .eq("email", req.email)
            .limit(1)
            .execute()
        )
        if not user.data:
            raise HTTPException(status_code=404, detail="No user found with that email")
        uin = user.data["uin"]

        # find latest rental by uin
        rental = (
            supabase.table("rental")
            .select("id")
            .eq("user_uin", uin)
            .order("start_time", desc=True)
            .limit(1)
            .execute()
        )
        if not rental.data:
            raise HTTPException(status_code=404, detail="No rentals found for this user")
        rental_id = rental.data[0]["id"]

        # reject duplicate open reports
        existing = (
            supabase.table("reports")
            .select("id")
            .eq("rental_id", rental_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=409,
                detail=f"A report already exists for rental {rental_id}"
            )

        # insert report
        response = (
            supabase.table("reports")
            .insert({
                "rental_id": rental_id,
                "body": req.body,
                "status": "open",
            })
            .execute()
        )
        return {"report": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit report: {e}")
        raise HTTPException(status_code=500, detail="Could not submit report")

@router.patch("/reports/{report_id}")
async def update_report(report_id: int, req: UpdateReport):
    try:
        response = (
            supabase.table("reports")
            .update({
                "rental_id": req.rental_id,
                "body": req.body,
                "email": req.email,
                "resolved": req.resolved,
            })
            .eq("id", report_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Report not found")
        return {"report": response.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update report {report_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not update report")

@router.delete("/reports/{report_id}", status_code=204)
async def delete_report(report_id: int):
    try:
        response = (
            supabase.table("reports")
            .delete()
            .eq("id", report_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Report not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete report {report_id}: {e}")
        raise HTTPException(status_code=500, detail="Could not delete report")