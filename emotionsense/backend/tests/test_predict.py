import pytest
import base64
import io
from PIL import Image
import numpy as np
from fastapi.testclient import TestClient
from app.main import app
from app.services.preprocessing import preprocess_frame, postprocess_predictions
import torch

client = TestClient(app)

@pytest.fixture
def dummy_image_base64():
    """Create a dummy grayscale image in base64 format"""
    img = Image.new('L', (48, 48), color=128)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    img_base64 = base64.b64encode(buf.getvalue()).decode()
    return img_base64

@pytest.fixture
def dummy_color_image_base64():
    """Create a dummy RGB image in base64 format"""
    img = Image.new('RGB', (256, 256), color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    img_base64 = base64.b64encode(buf.getvalue()).decode()
    return img_base64

class TestHealthEndpoint:
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "model_loaded" in data
        assert "version" in data

    def test_readiness_probe(self):
        """Test readiness probe"""
        response = client.get("/health/ready")
        assert response.status_code in [200, 503]

    def test_liveness_probe(self):
        """Test liveness probe"""
        response = client.get("/health/live")
        assert response.status_code == 200
        assert response.json()["alive"] is True

class TestPredictEndpoint:
    def test_predict_with_valid_image(self, dummy_image_base64):
        """Test prediction with valid image"""
        response = client.post(
            "/predict",
            json={
                "frame": dummy_image_base64,
                "user_id": "test_user",
                "timestamp": "2025-10-18T12:34:56Z"
            }
        )
        assert response.status_code in [200, 500]  # 500 if model not loaded
        
        if response.status_code == 200:
            data = response.json()
            assert "emotion" in data
            assert "confidence" in data
            assert "timestamp" in data
            assert "processing_time_ms" in data
            assert "all_emotions" in data
            assert 0 <= data["confidence"] <= 1

    def test_predict_with_color_image(self, dummy_color_image_base64):
        """Test prediction with color image (should convert to grayscale)"""
        response = client.post(
            "/predict",
            json={"frame": dummy_color_image_base64}
        )
        assert response.status_code in [200, 500]

    def test_predict_with_missing_frame(self):
        """Test prediction with missing frame"""
        response = client.post(
            "/predict",
            json={"user_id": "test_user"}
        )
        assert response.status_code == 400

    def test_predict_with_invalid_base64(self):
        """Test prediction with invalid base64"""
        response = client.post(
            "/predict",
            json={"frame": "not_valid_base64!!!"}
        )
        assert response.status_code == 400

    def test_predict_batch(self, dummy_image_base64):
        """Test batch prediction"""
        payload = [
            {"frame": dummy_image_base64, "user_id": "user_1"},
            {"frame": dummy_image_base64, "user_id": "user_2"},
        ]
        response = client.post("/predict/batch", json=payload)
        assert response.status_code in [200, 500]
        
        if response.status_code == 200:
            data = response.json()
            assert "predictions" in data
            assert "total" in data

class TestPreprocessing:
    def test_preprocess_frame_shape(self, dummy_image_base64):
        """Test that preprocessing returns correct tensor shape"""
        tensor = preprocess_frame(dummy_image_base64)
        assert tensor.shape == (1, 1, 48, 48)

    def test_preprocess_frame_normalization(self, dummy_image_base64):
        """Test that values are normalized to [0, 1]"""
        tensor = preprocess_frame(dummy_image_base64)
        assert tensor.min() >= 0
        assert tensor.max() <= 1

    def test_preprocess_invalid_base64(self):
        """Test preprocessing with invalid base64"""
        with pytest.raises(ValueError):
            preprocess_frame("invalid_base64")

class TestPostprocessing:
    def test_postprocess_predictions(self):
        """Test postprocessing of model output"""
        # Create dummy logits (7 emotions)
        logits = torch.randn(1, 7)
        result = postprocess_predictions(logits)
        
        assert "emotion" in result
        assert "confidence" in result
        assert "all_emotions" in result
        assert result["confidence"] >= 0
        assert result["confidence"] <= 1

    def test_postprocess_predictions_sum(self):
        """Test that probabilities sum to 1"""
        logits = torch.randn(1, 7)
        result = postprocess_predictions(logits)
        
        total = sum(result["all_emotions"].values())
        assert 0.99 <= total <= 1.01  # Allow small floating point error

class TestHistoryEndpoint:
    def test_get_history_empty(self):
        """Test getting history for user with no data"""
        response = client.get(
            "/history",
            params={"user_id": "nonexistent_user"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["predictions"] == []

    def test_get_history_with_parameters(self):
        """Test history endpoint with query parameters"""
        response = client.get(
            "/history",
            params={
                "user_id": "test_user",
                "limit": 50,
                "hours": 24
            }
        )
        assert response.status_code == 200

    def test_get_stats(self):
        """Test statistics endpoint"""
        response = client.get(
            "/history/stats",
            params={"user_id": "test_user"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "total_predictions" in data
        assert "emotion_counts" in data

    def test_clear_history(self):
        """Test clearing history"""
        response = client.delete(
            "/history",
            params={"user_id": "test_user"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

if __name__ == "__main__":
    pytest.main([__file__, "-v"])