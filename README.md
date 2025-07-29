# Dugong Classification System

An automated system for detecting and classifying dugongs from aerial imagery.

## Core Components

The system consists of several core modules that handle essential functionality:

### Backend Core Modules

- **Config** (`core/config.py`): Core configuration settings for file handling and model parameters

  - Manages upload directories
  - Defines allowed file types
  - Sets file size limits
  - Configures model paths

- **Logger** (`core/logger.py`): Logging configuration system

  - Provides file-based logging
  - Supports multiple log files
  - Configurable log levels

- **Cleanup** (`core/cleanup.py`): Automatic session management
  - Handles temporary file cleanup
  - Manages session expiration
  - Runs as background service

## Project Structure

```
backend/
├── core/           # Core system components
├── api/            # API routes and endpoints
├── services/       # Business logic services
├── schemas/        # Data validation schemas
├── images/         # Processed images storage
├── logs/          # Application logs
└── uploads/        # Temporary upload directory

frontend/
├── public/         # Static assets
├── src/           # Source code
└── components/     # React components
```

## Features

- Image upload and processing
- Dugong detection and classification
- Session management and cleanup
- Logging and monitoring
- Frontend visualization

## Configuration

- Max file size: 25MB
- Supported formats: .jpg, .jpeg, .png
- Session expiry: 2 minutes
- Cleanup interval: 120 seconds
