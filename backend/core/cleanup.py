import asyncio
from pathlib import Path
from datetime import datetime, timedelta
import shutil
import re
import json
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from google.cloud import storage
# from core.config import BASE_DIR  # No longer needed
from core.logger import setup_logger
from services.GCS_service import GCSService  # <-- Ensure this import path matches your project

logger = setup_logger("cleanup", "logs/cleanup.log")

# Remove SESSION_REGEX, is_session_expired, update_session_activity, cleanup_expired_sessions, and all BASE_DIR logic

def delete_all_gcs_uploads(bucket_name: str, prefix: str = "uploads/") -> int:
    """
    Delete all blobs in a GCS folder (e.g., 'uploads/').
    """
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix=prefix))
    if not blobs:
        logger.info("No GCS files found to delete under uploads/")
        return 0
    for blob in blobs:
        logger.info(f"Deleting blob: {blob.name}")
        blob.delete()
    logger.info(f"Deleted {len(blobs)} files from GCS under '{prefix}'")
    return len(blobs)

def start_midnight_cleanup(bucket_name: str):
    scheduler = AsyncIOScheduler()
    trigger = CronTrigger(hour=0, minute=0)  # Runs daily at 12:00 AM
    scheduler.add_job(lambda: delete_all_gcs_uploads(bucket_name), trigger)
    scheduler.start()
    logger.info("Scheduled daily GCS upload cleanup at 12:00 AM")

if __name__ == "__main__":
    # Only GCS cleanup logic remains
    start_midnight_cleanup(GCSService.BUCKET_NAME)
    asyncio.get_event_loop().run_forever()
