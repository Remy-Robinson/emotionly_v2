from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from app.models.model_loader import load_model
from app.routes import predict, health, history
from app.config import settings

# Configure logging
logging.basicConfig(level=settings.LOG_LEVEL)
logger = logging.getLogger(__name__)

# Global model instance
model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global model
    logger.info("Loading emotion detection model...")
    try:
        model = load_model(settings.MODEL_PATH)
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down EmotionSense API")

app = FastAPI(
    title="EmotionSense API",
    description="Real-time emotion detection backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(predict.router, tags=["predictions"])
app.include_router(history.router, tags=["history"])

@app.get("/")
async def root():
    return {
        "service": "EmotionSense API",
        "version": "1.0.0",
        "status": "running"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )