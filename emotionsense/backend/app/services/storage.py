import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# In-memory storage for development (replace with database in production)
_predictions_store: Dict[str, List[dict]] = {}
_stats_cache: Dict[str, dict] = {}

def store_prediction(user_id: str, prediction: dict) -> None:
    """
    Store emotion prediction in memory.
    
    Args:
        user_id: User identifier
        prediction: Prediction data with emotion, confidence, etc.
    """
    try:
        if user_id not in _predictions_store:
            _predictions_store[user_id] = []
        
        _predictions_store[user_id].append({
            **prediction,
            "stored_at": datetime.utcnow().isoformat() + "Z"
        })
        
        # Keep only last 1000 predictions per user to avoid memory bloat
        if len(_predictions_store[user_id]) > 1000:
            _predictions_store[user_id] = _predictions_store[user_id][-1000:]
        
        logger.debug(f"Prediction stored for user {user_id}")
    
    except Exception as e:
        logger.error(f"Error storing prediction: {e}")
        raise

def get_predictions(
    user_id: str,
    limit: int = 100,
    hours: int = 24
) -> List[dict]:
    """
    Retrieve predictions for user within time window.
    
    Args:
        user_id: User identifier
        limit: Maximum predictions to return
        hours: Look back period in hours
    
    Returns:
        List of predictions
    """
    try:
        if user_id not in _predictions_store:
            return []
        
        predictions = _predictions_store[user_id]
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        filtered = []
        for p in predictions:
            try:
                timestamp = datetime.fromisoformat(p["timestamp"].replace("Z", "+00:00"))
                if timestamp > cutoff_time:
                    filtered.append(p)
            except (ValueError, KeyError):
                continue
        
        return filtered[-limit:]
    
    except Exception as e:
        logger.error(f"Error retrieving predictions: {e}")
        return []

def get_emotion_stats(user_id: str, hours: int = 24) -> dict:
    """
    Calculate emotion statistics for user.
    
    Args:
        user_id: User identifier
        hours: Look back period in hours
    
    Returns:
        Statistics dictionary
    """
    try:
        predictions = get_predictions(user_id, limit=10000, hours=hours)
        
        if not predictions:
            return {
                "user_id": user_id,
                "total": 0,
                "emotion_counts": {},
                "dominant_emotion": None,
                "average_confidence": 0.0
            }
        
        emotion_counts = {}
        total_confidence = 0.0
        
        for p in predictions:
            emotion = p.get("emotion", "Unknown")
            emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            total_confidence += p.get("confidence", 0)
        
        total = len(predictions)
        avg_confidence = total_confidence / total if total > 0 else 0
        
        # Find dominant emotion
        dominant = max(emotion_counts.items(), key=lambda x: x[1])[0] if emotion_counts else None
        
        stats = {
            "user_id": user_id,
            "total": total,
            "emotion_counts": emotion_counts,
            "dominant_emotion": dominant,
            "average_confidence": round(avg_confidence, 4),
            "by_emotion": [
                {"emotion": e, "count": c}
                for e, c in sorted(emotion_counts.items(), key=lambda x: x[1], reverse=True)
            ]
        }
        
        # Cache stats for quick retrieval
        _stats_cache[user_id] = stats
        
        logger.debug(f"Stats calculated for user {user_id}")
        return stats
    
    except Exception as e:
        logger.error(f"Error calculating stats: {e}")
        return {
            "user_id": user_id,
            "total": 0,
            "emotion_counts": {},
            "dominant_emotion": None,
            "average_confidence": 0.0
        }

def clear_predictions(user_id: str) -> bool:
    """
    Delete all predictions for a user.
    
    Args:
        user_id: User identifier
    
    Returns:
        True if successful
    """
    try:
        if user_id in _predictions_store:
            del _predictions_store[user_id]
        if user_id in _stats_cache:
            del _stats_cache[user_id]
        
        logger.info(f"Predictions cleared for user {user_id}")
        return True
    
    except Exception as e:
        logger.error(f"Error clearing predictions: {e}")
        return False

def get_all_stats() -> dict:
    """
    Get statistics across all users.
    
    Returns:
        Global statistics
    """
    try:
        total_users = len(_predictions_store)
        total_predictions = sum(len(preds) for preds in _predictions_store.values())
        
        all_emotions = {}
        for preds in _predictions_store.values():
            for p in preds:
                emotion = p.get("emotion", "Unknown")
                all_emotions[emotion] = all_emotions.get(emotion, 0) + 1
        
        return {
            "total_users": total_users,
            "total_predictions": total_predictions,
            "emotion_distribution": all_emotions
        }
    
    except Exception as e:
        logger.error(f"Error getting global stats: {e}")
        return {
            "total_users": 0,
            "total_predictions": 0,
            "emotion_distribution": {}
        }

def export_user_data(user_id: str) -> str:
    """
    Export all user data as JSON string.
    
    Args:
        user_id: User identifier
    
    Returns:
        JSON string of user data
    """
    try:
        predictions = get_predictions(user_id, limit=10000, hours=8760)  # 1 year
        stats = get_emotion_stats(user_id, hours=8760)
        
        export_data = {
            "user_id": user_id,
            "export_date": datetime.utcnow().isoformat() + "Z",
            "total_predictions": len(predictions),
            "predictions": predictions,
            "statistics": stats
        }
        
        return json.dumps(export_data, indent=2)
    
    except Exception as e:
        logger.error(f"Error exporting user data: {e}")
        return "{}"

def import_user_data(user_id: str, data_json: str) -> bool:
    """
    Import predictions from JSON data.
    
    Args:
        user_id: User identifier
        data_json: JSON string of predictions
    
    Returns:
        True if successful
    """
    try:
        data = json.loads(data_json)
        predictions = data.get("predictions", [])
        
        if user_id not in _predictions_store:
            _predictions_store[user_id] = []
        
        for pred in predictions:
            _predictions_store[user_id].append(pred)
        
        logger.info(f"Imported {len(predictions)} predictions for user {user_id}")
        return True
    
    except Exception as e:
        logger.error(f"Error importing user data: {e}")
        return False