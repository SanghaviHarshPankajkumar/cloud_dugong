from pathlib import Path
from fastapi import UploadFile, HTTPException
from core.config import MAX_FILE_SIZE, ALLOWED_EXTENSIONS
from core.logger import setup_logger

logger = setup_logger("file_service", "logs/file_service.log")

def validate_file(file: UploadFile, contents: bytes) -> None:
    """
    Validate uploaded file size and type.
    Raises HTTPException if validation fails.
    """
    if len(contents) > MAX_FILE_SIZE:
        logger.warning(f"File too large: {file.filename}")
        raise HTTPException(status_code=400, detail=f"File {file.filename} is too large")
    if Path(file.filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        logger.warning(f"Invalid extension: {file.filename}")
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.filename}")

