#!/bin/bash
set -e  # Exit on any error

echo "=== Starting Dugong Classification Monolith ==="

# Set default port if not provided by Cloud Run
export PORT=${PORT:-8080}

echo "Using PORT: $PORT"

# Decode base64 key file if it exists
if [ -f "/app/key.json.b64" ]; then
    echo "Decoding Google Cloud key..."
    base64 -d /app/key.json.b64 > /app/key.json
    export GOOGLE_APPLICATION_CREDENTIALS="/app/key.json"
    echo "Google Cloud credentials configured"
fi

# Create nginx config with dynamic port
echo "Configuring Nginx for port $PORT..."
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf > /tmp/nginx.conf
mv /tmp/nginx.conf /etc/nginx/conf.d/default.conf

# Validate nginx configuration
nginx -t

# Start FastAPI backend in background
echo "Starting FastAPI backend on port 8000..."
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait a moment for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ERROR: Backend failed to start"
    exit 1
fi

echo "Backend started successfully (PID: $BACKEND_PID)"

# Start Nginx (serves frontend and proxies to backend)
echo "Starting Nginx server on port $PORT..."

# Function to handle graceful shutdown
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null || true
    nginx -s quit 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Start nginx in foreground
exec nginx -g "daemon off;"
