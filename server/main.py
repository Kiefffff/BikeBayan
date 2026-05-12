from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from pathlib import Path
from server.api import health
from server.api import users
from server.api import mosip_auth
from server.api import verify
from server.api import bikes
from server.api import rentals
from server.api import reports
from contextlib import asynccontextmanager
from supabase import create_client, Client
from datetime import datetime, timezone
import asyncio
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)
PH_TZ = timezone(timedelta(hours=8))
async def check_late_bikes_loop():
    while True:
        try:
            active_rentals = supabase.table("rental").select("user_uin, start_time").is_("end_time", None).execute()
            
            if active_rentals.data:
                now_time = datetime.now(timezone.utc)
                
                for rental in active_rentals.data:
                    start_time_str = rental['start_time'].replace('Z', '')
                    start_time = datetime.fromisoformat(start_time_str)
                    
                    if start_time.tzinfo is None:
                        start_time = start_time.replace(tzinfo=PH_TZ)
                        
                    duration_hours = (now_time - start_time).total_seconds() / 3600.0
                    
                    if duration_hours > 3: 
                        
                        user_check = supabase.table("user").select("status").eq("uin", rental["user_uin"]).execute()
                        
                        if user_check.data and user_check.data[0]["status"] != "Flagged":
                            supabase.table("user").update({"status": "Flagged"}).eq("uin", rental["user_uin"]).execute()
                            print(f"AUTOMATIC FLAG: User {rental['user_uin']} exceeded 3 hours.")

        except Exception as e:
            print(f"Background check failed: {e}")
            
        await asyncio.sleep(300)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # This runs when the server starts
    task = asyncio.create_task(check_late_bikes_loop())
    yield
    # This runs when the server shuts down
    task.cancel()

app = FastAPI(title="BikeBayan", lifespan=lifespan)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: update to frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix="/api")
# app.include_router(users.router, prefix="/users")
app.include_router(mosip_auth.router, prefix="/api")
app.include_router(verify.router, prefix="/api")
app.include_router(bikes.router, prefix="/api")
app.include_router(rentals.router, prefix="/api")
app.include_router(reports.router, prefix="/api")

# @app.get("/")
# async def root():
#     return {"message": "Welcome to BikeBayan!"}