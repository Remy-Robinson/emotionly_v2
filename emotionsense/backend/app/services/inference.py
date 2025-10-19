import torch
import time
import logging
from datetime import datetime
from app.services.preprocessing import (
    preprocess_frame,
    postprocess_predictions,
    get_emotion_color,
    get_emotion_emoji
)
from app.config import settings

logger = logging.getLogger(__name__)

async def predict_emotion(model, frame_base64: str, user_id: str = None, timestamp: str = None):
    """
    Run emotion prediction on a single frame.
    
    Args:
        model: Loaded PyTorch model
        frame_base64: Base64 encoded image
        user_id: Optional user identifier
        timestamp: Optional ISO format timestamp
    
    Returns:
        Dictionary with emotion, confidence, and metadata
    """
    start_time = time.time()
    device = settings.MODEL_DEVICE
    
    try:
        # Preprocess frame
        img_tensor = preprocess_frame(frame_base64)
        img_tensor = img_tensor.to(device)
        
        # Run inference
        with torch.no_grad():
            logits = model(img_tensor)
        
        # Postprocess
        prediction = postprocess_predictions(logits)
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000
        
        # Format response
        emotion = prediction["emotion"]
        response = {
            "emotion": emotion,
            "confidence": round(prediction["confidence"], 4),
            "timestamp": timestamp or datetime.utcnow().isoformat() + "Z",
            "processing_time_ms": round(processing_time, 2),
            "all_emotions": {k: round(v, 4) for k, v in prediction["all_emotions"].items()},
            "color": get_emotion_color(emotion),
            "emoji": get_emotion_emoji(emotion),
            "user_id": user_id
        }
        
        logger.debug(f"Prediction: {emotion} ({prediction['confidence']:.2%}) in {processing_time:.2f}ms")
        return response
    
    except Exception as e:
        logger.error(f"Error during inference: {e}")
        raise

async def batch_predict(model, frames_list: list) -> list:
    """
    Run predictions on multiple frames for efficiency.
    
    Args:
        model: Loaded PyTorch model
        frames_list: List of dicts with 'frame', 'user_id', 'timestamp'
    
    Returns:
        List of prediction results
    """
    results = []
    for frame_data in frames_list:
        try:
            result = await predict_emotion(
                model,
                frame_data.get("frame"),
                user_id=frame_data.get("user_id"),
                timestamp=frame_data.get("timestamp")
            )
            results.append(result)
        except Exception as e:
            logger.error(f"Error in batch prediction: {e}")
            results.append({"error": str(e)})
    
    return results

def validate_confidence(confidence: float) -> bool:
    """Check if prediction confidence meets threshold"""
    return confidence >= settings.CONFIDENCE_THRESHOLD