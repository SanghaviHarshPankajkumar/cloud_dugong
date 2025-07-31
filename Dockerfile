# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder

WORKDIR /app
COPY frontend/ /app/
RUN npm install && npm run build

# Stage 2: Backend + Frontend + MongoDB + Nginx
FROM python:3.11

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    ffmpeg \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Set environment (base)
ENV PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0

# Add your application environment variables
ENV MONGODB_URI=mongodb+srv://harsh:harsh@practice.acsbh.mongodb.net/?retryWrites=true&w=majority&appName=practice/DugongMonitoring \
    VITE_API_URL=https://service-name-821207759670.europe-west1.run.app \
    KEY_PATH=/dugongmonitoring.json \
    BUCKET_NAME=dugongstorage \
    GOOGLE_APPLICATION_CREDENTIALS=/app/dugongmonitoring.json

WORKDIR /app

# Copy backend code
COPY backend/ /app/backend/
COPY model/ /app/model/
COPY dugongmonitoring.json /app/dugongmonitoring.json

# Install backend requirements
RUN pip install --upgrade pip
RUN pip install -r /app/backend/requirements.txt

# Copy built frontend
COPY --from=frontend-builder /app/dist /app/frontend/

# Configure Nginx
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script
COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Expose port for Cloud Run
EXPOSE 8080

# Start everything via script
CMD ["/app/startup.sh"]
