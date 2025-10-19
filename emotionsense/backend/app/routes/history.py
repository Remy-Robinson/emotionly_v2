from fastapi import APIRouter, Query, HTTPException, status
from app.schemas import HistoryResponse
from app.services import storage
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/history", tags=["history"])

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
        predictions = storage.get_predictions(user_id, limit, hours)
        
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
        stats = storage.get_emotion_stats(user_id, hours)
        
        return stats
    
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
        success = storage.clear_predictions(user_id)
        
        if success:
            return {"message": f"History cleared for user {user_id}"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clear history"
            )
    
    except Exception as e:
        logger.error(f"Error clearing history: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error clearing history"
        )

@router.get("/export")
async def export_data(user_id: str = Query(..., description="User identifier")):
    """
    Export all emotion data for a user as JSON.
    
    Returns JSON data that can be downloaded and imported later.
    """
    try:
        data_json = storage.export_user_data(user_id)
        
        return {
            "user_id": user_id,
            "data": data_json,
            "export_date": datetime.utcnow().isoformat() + "Z"
        }
    
    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error exporting data"
        )

@router.post("/import")
async def import_data(
    user_id: str = Query(..., description="User identifier"),
    data_json: str = Query(..., description="JSON data to import")
):
    """
    Import emotion data for a user from JSON.
    """
    try:
        success = storage.import_user_data(user_id, data_json)
        
        if success:
            return {"message": f"Data imported successfully for user {user_id}"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format"
            )
    
    except Exception as e:
        logger.error(f"Error importing data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error importing data"
        )

@router.get("/global-stats")
async def get_global_stats():
    """
    Get statistics across all users (admin endpoint).
    """
    try:
        stats = storage.get_all_stats()
        return stats
    
    except Exception as e:
        logger.error(f"Error getting global stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting global statistics"
        )