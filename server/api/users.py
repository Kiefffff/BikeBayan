from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from passlib.context import CryptContext
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

router = APIRouter(prefix="/users", tags=["users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserCreate(BaseModel):
    uin: str
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    password: str | None = None

@router.post("/users", status_code=201)
async def create_user(user: UserCreate):
    # Hash password
    hashed_password = pwd_context.hash(user.password)
    
    # Check if user exists
    existing = supabase.table("user").select("uin").eq("uin", user.uin).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Insert user
    user_data = {
        "uin": user.uin,
        "name": user.name,
        "email": user.email,
        "password": hashed_password,  # Ishan named it "password"
        "status": "Cleared"
    }
    supabase.table("user").insert(user_data).execute()
    
    return {"message": "User created successfully", "uin": user.uin}

@router.post("/login")
async def login(credentials: UserLogin):
    # Find user by email
    user = supabase.table("user").select("*").eq("email", credentials.email).execute()
    
    if not user.data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user_data = user.data[0]
    
    # Verify password
    if not pwd_context.verify(credentials.password, user_data["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Return user info (without password)
    return {
        "success": True,
        "uin": user_data["uin"],
        "name": user_data["name"],
        "email": user_data["email"],
        "status": user_data["status"]
    }

@router.put("/users/{uin}")
async def update_user(uin: str, user: UserUpdate):
    update_data = {}
    
    if user.name:
        update_data["name"] = user.name
    if user.email:
        update_data["email"] = user.email
    if user.password:
        update_data["password"] = pwd_context.hash(user.password)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    supabase.table("user").update(update_data).eq("uin", uin).execute()
    
    return {"message": "User updated successfully"}

@router.get("/users/{uin}")
async def get_user(uin: str):
    user = supabase.table("user").select("*").eq("uin", uin).execute()
    
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Remove password from response
    user_data = user.data[0]
    user_data.pop("password", None)
    
    return user_data