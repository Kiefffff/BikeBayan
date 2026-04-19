from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AWS FastAPI Minimal"
    # DATABASE_URL: str | None = None

    class Config:
        case_sensitive = True

settings = Settings()
