from fastapi import APIRouter, Query, HTTPException, status
from app.schemas import HistoryResponse
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/history", tags=["history"])

# In-memory storage for demo (replace with database in production)
_prediction_store: dict = {}

def store_prediction(user_id: str, prediction: dict):
    """Store prediction in memory"""
    if user_id not in _prediction_store:
        _prediction_store[user_id] = []
    _prediction_store[user_id].append(prediction)

def get_predictions(
    user_id: str,
    limit: int = 100,
    hours: int = 24
) -> list:
    """Retrieve predictions for user within time window"""
    if user_id not in _prediction_store:
        return []
    
    predictions = _prediction_store[user_id]
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    
    filtered = [
        p for p in predictions
        if datetime.fromisoformat(p["timestamp"].replace("Z", "+00:00")) > cutoff_time
    ]
    
    return filtered[-limit:]

@router.get("", response_model=HistoryResponse)
async def get_emotion_history(
    user_id: str = Query(..., description="User identifier"),
    limit: int = Query(100, ge=1, le=1000, description="Max results"),
    hours: int = Query(24, ge=1, le=168, description="Hours lookback")
):
    """
    Get emotion prediction history for a user.
    
    Args:
        user_id: User identifier
        limit: Maximum number of predictions to return
        hours: Look back period in hours (1-168)
    
    Returns:
        HistoryResponse with predictions and metadata
    """
    try:
        predictions = get_predictions(user_id, limit, hours)
        
        return HistoryResponse(
            predictions=predictions,
            total=len(predictions),
            user_id=user_id,
            start_time=(datetime.utcnow() - timedelta(hours=hours)).isoformat() + "Z",
            end_time=datetime.utcnow().isoformat() + "Z"
        )
    
    except Exception as e:
        logger.error(f"Error retrieving history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving prediction history"
        )

@router.get("/stats")
async def get_emotion_stats(
    user_id: str = Query(..., description="User identifier"),
    hours: int = Query(24, ge=1, le=168, description="Hours lookback")
):
    """
    Get emotion statistics for a user.
    
    Returns emotion counts and dominant emotion.
    """
    try:
        predictions = get_predictions(user_id, limit=10000, hours=hours)
        
        if not predictions:
            return {
                "user_id": user_id,
                "total_predictions": 0,
                "emotion_counts": {},
                "dominant_emotion": None,
                "average_confidence": 0
            }
        
        emotion_counts = {}
        total_confidence = 0
        
        for p in predictions:
            emotion = p["emotion"]
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            total_confidence += p["confidence"]
        
        dominant = max(emotion_counts.items(), key=lambda x: x[1])[0]
        avg_confidence = total_confidence / len(predictions)
        
        return {
            "user_id": user_id,
            "total_predictions": len(predictions),
            "emotion_counts": emotion_counts,
            "dominant_emotion": dominant,
            "average_confidence": round(avg_confidence, 4)
        }
    
    except Exception as e:
        logger.error(f"Error calculating stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error calculating emotion statistics"
        )

@router.delete("")
async def clear_history(user_id: str = Query(..., description="User identifier")):
    """Clear all emotion history for a user"""
    try:
        if user_id in _prediction_store:
            del _prediction_store[user_id]
        
        return {"message": f"History cleared for user {user_id}"}
    
    except Exception as e:
        logger.error(f"Error clearing history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error clearing history"
        )