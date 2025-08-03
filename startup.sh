#!/bin/bash
set -e  # Exit on any error

echo "=== Starting Dugong Classification Monolith ==="

# 5. Start FastAPI backend in background
echo "Starting FastAPI backend..."
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &

# 6. Start Nginx (serves frontend and proxies to backend)
echo "Starting Nginx server..."
exec nginx -g "daemon off;"
