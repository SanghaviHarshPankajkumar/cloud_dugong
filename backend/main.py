# main.py
import certifi
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
import asyncio
import os
from auth.login import router as login_router
from api.routes import router as api_router
# from auth.google_auth import router as auth_router
from core.logger import setup_logger
from fastapi.staticfiles import StaticFiles

# Load environment variables from .env file
load_dotenv()


print(certifi.where())


# Get secret key from environment
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")

# App logger
app_logger = setup_logger("app", "logs/app.log")

# Ensure base directories exist BEFORE initializing FastAPI
os.makedirs("logs", exist_ok=True)

# Initialize FastAPI app
app = FastAPI(title="YOLO Image Uploader")
app_logger.info("App initialized")

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Add session middleware required for OAuth login
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Background task: periodically clean expired session folders
@app.on_event("startup")
async def startup_event():
    app_logger.info("Starting session-based cleanup background task")

# Register routers
app.include_router(api_router, prefix="/api")     # Main API
# app.include_router(auth_router)                   # Google OAuth
app.include_router(login_router)                  # Email/Password Login

@app.get("/")
async def root():
    return {"message": "Dugong Taxonomy API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2025-01-01T00:00:00Z"}