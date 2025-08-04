
# Stage 1: Build frontend
FROM node:22-alpine AS frontend-builder

# Allow API URL to be overridden at build time
ARG VITE_API_URL="/api"

WORKDIR /app
COPY frontend/ /app/

ENV VITE_API_URL=${VITE_API_URL}

RUN npm install && npm run build

# Stage 2: Backend + Frontend + MongoDB + Nginx
FROM python:3.11

# Install system dependencies including CA certificates & OpenSSL
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    ffmpeg \
    nginx \
    ca-certificates \
    openssl \
    gettext-base \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set environment (base)
ENV PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8080

ENV MONGODB_URI="mongodb+srv://harsh:harsh@practice.acsbh.mongodb.net/?retryWrites=true&w=majority&appName=practice" \
    BUCKET_NAME="dugongstorage"

WORKDIR /app

# Copy backend code
COPY backend/ /app/backend/
COPY key.json.b64 /app/key.json.b64

# Install backend requirements
RUN pip install --upgrade pip certifi
RUN pip install -r /app/backend/requirements.txt

# Copy built frontend
COPY --from=frontend-builder /app/dist /app/frontend/

# Configure Nginx
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy startup script
COPY startup.sh /app/startup.sh
RUN chmod +x /app/startup.sh

# Create nginx user and set permissions
RUN mkdir -p /var/log/nginx /var/cache/nginx && \
    chown -R www-data:www-data /var/log/nginx /var/cache/nginx && \
    chmod -R 755 /var/log/nginx /var/cache/nginx

# Expose port for Cloud Run
EXPOSE 8080

# Start everything via script
CMD ["/app/startup.sh"]
