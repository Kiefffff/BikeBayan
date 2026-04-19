from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class UserCreate(BaseModel):
    id: int
    name: str
    email: str

@router.post("/users", status_code=201)
async def create_user(user: UserCreate):
    print(f"Received user: {user.name} ({user.email}) with ID: {user.id}")
    return {
        "message": "User successfully received!",
        "received_data": user
    }