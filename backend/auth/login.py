from fastapi import FastAPI, APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import uuid

# Load environment variables
load_dotenv()

# FastAPI app and router
app = FastAPI()     
router = APIRouter(prefix="/auth", tags=["auth"])

# Config
MONGO_URL = os.getenv("MONGO_URI")  # Changed from MONGO_URL to MONGO_URI
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# MongoDB setup
try:
    client = MongoClient(MONGO_URL)
    # Test the connection
    client.admin.command('ping')
    db = client["DugongMonitoring"]
    user_collection = db["users"]
    print(f"Successfully connected to MongoDB at {MONGO_URL}")
except Exception as e:
    print(f"Failed to connect to MongoDB: {e}")
    # Don't exit here, let the error be handled in the endpoint

# Request and response models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    session_id: str
    username :str
    email: str

# Token creation function
def create_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Login endpoint
@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    try:
        print("MONGO_URL:", MONGO_URL)
        print("Login request received:", request.email)

        # Test MongoDB connection
        client.admin.command('ping')
        print("MongoDB connection successful")

        user = user_collection.find_one({"email": request.email})
        print("User found:", bool(user))
        if not user:
            raise HTTPException(status_code=401, detail="Email not found")

        stored_password = user.get("hashed_password", "")
        print("Password check starting...")

        # Handle both hashed and accidentally stored plaintext passwords (only for dev)
        if stored_password.startswith("$2b$"):
            password_valid = pwd_context.verify(request.password, stored_password)
        else:
            print("WARNING: Plaintext password detected in DB. This is not secure!")
            password_valid = request.password == stored_password

        if not password_valid:
            raise HTTPException(status_code=401, detail="Incorrect password")

        username = user.get("username", "")
        useremail = user.get("email", "")
        
        # --- SESSION ID LOGIC ---
        session_id = user.get("session_id")
        if not session_id:
            session_id = str(uuid.uuid4())
            user_collection.update_one({"email": request.email}, {"$set": {"session_id": session_id}})

        token = create_token(
            {"sub": user["email"]},
            timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return {"access_token": token, "token_type": "bearer", "session_id": session_id, "email": useremail, "username": username}
    
    except HTTPException:
        # Re-raise HTTP exceptions (like 401 errors)
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# Include the router in the app
app.include_router(router)
