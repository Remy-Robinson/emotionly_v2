from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application configuration"""
    
    # API
    APP_NAME: str = "EmotionSense"
    DEBUG: bool = os.getenv("DEBUG", "False") == "True"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Model
    MODEL_PATH: str = os.getenv("MODEL_PATH", "app/models/emotion_cnn.pth")
    MODEL_DEVICE: str = os.getenv("MODEL_DEVICE", "cpu")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ]
    if os.getenv("CORS_ORIGINS"):
        CORS_ORIGINS = os.getenv("CORS_ORIGINS").split(",")
    
    # Database (optional)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./emotions.db")
    ENABLE_HISTORY: bool = os.getenv("ENABLE_HISTORY", "False") == "True"
    
    # Inference
    CONFIDENCE_THRESHOLD: float = 0.3
    MAX_FRAME_SIZE: int = 512 * 512  # pixels
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()