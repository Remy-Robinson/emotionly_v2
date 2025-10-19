import torch
import numpy as np
from PIL import Image
import io
import base64
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Standard dimensions for FER2013 dataset
TARGET_SIZE = (48, 48)
EMOTIONS = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"]

def decode_base64_frame(frame_base64: str) -> Image.Image:
    """
    Decode base64 encoded image frame.
    
    Args:
        frame_base64: Base64 encoded image string
    
    Returns:
        PIL Image object
    """
    try:
        image_data = base64.b64decode(frame_base64)
        image = Image.open(io.BytesIO(image_data))
        return image
    except Exception as e:
        logger.error(f"Error decoding base64 frame: {e}")
        raise ValueError("Invalid base64 image format")

def validate_image_size(image: Image.Image) -> bool:
    """
    Validate image doesn't exceed maximum size.
    
    Args:
        image: PIL Image object
    
    Returns:
        True if valid, raises exception otherwise
    """
    pixels = image.width * image.height
    if pixels > settings.MAX_FRAME_SIZE:
        raise ValueError(f"Image too large: {pixels} pixels > {settings.MAX_FRAME_SIZE} max")
    return True

def preprocess_frame(frame_base64: str) -> torch.Tensor:
    """
    Convert raw base64 image frame to preprocessed tensor.
    
    Pipeline:
    1. Decode base64
    2. Validate size
    3. Resize to model input size
    4. Convert to grayscale
    5. Normalize to [0, 1]
    6. Add batch & channel dimensions
    7. Convert to torch tensor
    
    Args:
        frame_base64: Base64 encoded image string
    
    Returns:
        Preprocessed tensor shape (1, 1, 48, 48)
    """
    try:
        # Decode
        image = decode_base64_frame(frame_base64)
        
        # Validate
        validate_image_size(image)
        
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Resize
        image = image.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
        
        # Convert to numpy and normalize
        img_array = np.array(image, dtype=np.float32) / 255.0
        
        # Add batch and channel dimensions: (H, W) -> (1, 1, H, W)
        img_tensor = torch.from_numpy(img_array).unsqueeze(0).unsqueeze(0)
        
        logger.debug(f"Preprocessed frame shape: {img_tensor.shape}")
        return img_tensor
    
    except Exception as e:
        logger.error(f"Error preprocessing frame: {e}")
        raise

def postprocess_predictions(logits: torch.Tensor) -> dict:
    """
    Convert model output logits to emotion predictions.
    
    Args:
        logits: Model output tensor shape (1, 7)
    
    Returns:
        Dictionary with emotion, confidence, and all_emotions
    """
    try:
        # Apply softmax to get probabilities
        probabilities = torch.nn.functional.softmax(logits, dim=1)[0]
        
        # Get top prediction
        confidence, emotion_idx = torch.max(probabilities, dim=0)
        emotion_label = EMOTIONS[emotion_idx.item()]
        confidence_score = confidence.item()
        
        # Create emotion dictionary
        all_emotions = {
            EMOTIONS[i]: probabilities[i].item()
            for i in range(len(EMOTIONS))
        }
        
        return {
            "emotion": emotion_label,
            "confidence": confidence_score,
            "all_emotions": all_emotions
        }
    
    except Exception as e:
        logger.error(f"Error postprocessing predictions: {e}")
        raise

def get_emotion_color(emotion: str) -> dict:
    """
    Get RGB color associated with emotion for UI visualization.
    
    Args:
        emotion: Emotion label
    
    Returns:
        Dictionary with r, g, b values
    """
    color_map = {
        "Happy": {"r": 255, "g": 215, "b": 0},      # Gold
        "Sad": {"r": 70, "g": 130, "b": 180},       # Steel blue
        "Angry": {"r": 255, "g": 0, "b": 0},        # Red
        "Disgust": {"r": 34, "g": 139, "b": 34},    # Forest green
        "Fear": {"r": 128, "g": 0, "b": 128},       # Purple
        "Surprise": {"r": 255, "g": 165, "b": 0},   # Orange
        "Neutral": {"r": 169, "g": 169, "b": 169}   # Dark gray
    }
    return color_map.get(emotion, {"r": 128, "g": 128, "b": 128})

def get_emotion_emoji(emotion: str) -> str:
    """Get emoji representation of emotion"""
    emoji_map = {
        "Happy": "😊",
        "Sad": "😢",
        "Angry": "😠",
        "Disgust": "🤢",
        "Fear": "😨",
        "Surprise": "😲",
        "Neutral": "😐"
    }
    return emoji_map.get(emotion, "🤔")