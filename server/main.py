from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.core.settings import settings
from server.api import health
from server.api import users
from server.api import auth  # ← ADD THIS IMPORT

app = FastAPI(title=settings.PROJECT_NAME)

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update i think to frontend URL later on
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix="/api")
app.include_router(users.router, prefix="/users")
app.include_router(auth.router, prefix="/api")  

@app.get("/")
async def root():
    return {"message": "Hello world!"}
