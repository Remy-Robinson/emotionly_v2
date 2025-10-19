from pydantic import BaseModel, Field
from typing import Dict, Optional
from datetime import datetime

class PredictionRequest(BaseModel):
    """Request model for emotion prediction"""
    frame: str = Field(..., description="Base64 encoded image frame")
    timestamp: Optional[str] = Field(None, description="ISO format timestamp")
    user_id: Optional[str] = Field(None, description="User identifier for logging")
    
    class Config:
        json_schema_extra = {
            "example": {
                "frame": "iVBORw0KGgoAAAANS...",
                "timestamp": "2025-10-18T12:34:56Z",
                "user_id": "user_123"
            }
        }

class EmotionPrediction(BaseModel):
    """Response model for emotion prediction"""
    emotion: str = Field(..., description="Predicted emotion label")
    confidence: float = Field(..., description="Confidence score 0-1")
    timestamp: str = Field(..., description="Prediction timestamp")
    processing_time_ms: float = Field(..., description="Inference time in milliseconds")
    all_emotions: Dict[str, float] = Field(..., description="All emotion probabilities")
    
    class Config:
        json_schema_extra = {
            "example": {
                "emotion": "Happy",
                "confidence": 0.92,
                "timestamp": "2025-10-18T12:34:56Z",
                "processing_time_ms": 45.2,
                "all_emotions": {
                    "Angry": 0.01,
                    "Disgust": 0.0,
                    "Fear": 0.0,
                    "Happy": 0.92,
                    "Neutral": 0.05,
                    "Sad": 0.02,
                    "Surprise": 0.0
                }
            }
        }

class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether model is loaded")
    version: str = Field(..., description="API version")
    device: str = Field(..., description="Inference device")

class PredictionLog(BaseModel):
    """Model for storing prediction logs"""
    id: Optional[int] = None
    user_id: str
    emotion: str
    confidence: float
    timestamp: datetime
    all_emotions: str  # JSON string
    processing_time_ms: float
    
    class Config:
        from_attributes = True

class HistoryResponse(BaseModel):
    """Response model for emotion history"""
    predictions: list[dict] = Field(..., description="List of predictions")
    total: int = Field(..., description="Total number of predictions")
    user_id: str = Field(..., description="User identifier")
    start_time: Optional[str] = None
    end_time: Optional[str] = None

class ErrorResponse(BaseModel):
    """Response model for errors"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = None
    status_code: int = Field(..., description="HTTP status code")