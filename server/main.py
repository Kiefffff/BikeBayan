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
from server.api import auth  
from server.api import rentals
app = FastAPI(title="BikeBayan")


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
app.include_router(users.router, prefix="/users")
app.include_router(mosip_auth.router, prefix="/api")
app.include_router(verify.router, prefix="/api")
app.include_router(bikes.router, prefix="/api")
app.include_router(rentals.router)

@app.get("/")
async def root():
    return {"message": "Welcome to BikeBayan!"}