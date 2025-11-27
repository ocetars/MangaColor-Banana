"""
MangaColor-G Backend Server
FastAPI application for manga colorization processing
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api import routes, websocket

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events"""
    # Startup
    print("🚀 MangaColor-G Backend starting...")
    
    # Create necessary directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("outputs", exist_ok=True)
    
    yield
    
    # Shutdown
    print("👋 MangaColor-G Backend shutting down...")


app = FastAPI(
    title="MangaColor-G API",
    description="Interactive manga colorization tool powered by Google Gemini",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local Electron app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(routes.router, prefix="/api")
app.include_router(websocket.router, prefix="/ws")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "app": "MangaColor-G",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "websocket": "ready"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8765,
        reload=True
    )

