#!/bin/bash
set -e  # Exit on any error

echo "=== Starting Dugong Classification Backend ==="

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
while ! python -c "from pymongo import MongoClient; MongoClient('mongodb://mongo:27017').admin.command('ping')" 2>/dev/null; do
    echo "MongoDB not ready, waiting..."
    sleep 2
done

echo "MongoDB is ready!"

# Create uploads directory BEFORE starting FastAPI
echo "Creating uploads directory..."
mkdir -p /app/uploads
echo "Uploads directory created at: $(ls -la /app/uploads)"

# Run user creation script
echo "Creating initial user..."
python /app/server/create_user.py

# Start the FastAPI application
echo "Starting FastAPI application..."
echo "Current working directory: $(pwd)"
echo "Contents of /app/server: $(ls -la /app/server/)"
exec uvicorn main:app --host 0.0.0.0 --port 8000 --app-dir /app/server
