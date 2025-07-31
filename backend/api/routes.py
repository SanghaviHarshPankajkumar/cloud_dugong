import shutil
import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse, StreamingResponse
from typing import List
from datetime import datetime
from tempfile import NamedTemporaryFile
from pathlib import Path
from uuid import uuid4
import io
import csv
import tempfile
import uuid
from services.GCS_service import GCSService
from services.file_service import validate_file
from services.model_service import run_model_on_images
from schemas.response import ImageResult
from core.logger import setup_logger
from schemas.request import MoveImageRequest
from schemas.response import ImageResult
from services.GCS_service import GCSService
from services.file_service import validate_file
from services.model_service import run_model_on_images
from schemas.request import MoveImageRequest
from pymongo import MongoClient
from dotenv import load_dotenv
from google.cloud import storage



logger = setup_logger("api", "logs/api.log")
router = APIRouter()

def download_blob_to_tempfile(blob_path: str) -> Path:
    client = storage.Client.from_service_account_json(GCSService.KEY_PATH)
    bucket = client.bucket(GCSService.BUCKET_NAME)
    blob = bucket.blob(blob_path)

    if not blob.exists():
        raise FileNotFoundError(f"GCS blob not found: {blob_path}")

    suffix = Path(blob_path).suffix
    tmp_file = NamedTemporaryFile(delete=False, suffix=suffix)
    blob.download_to_filename(tmp_file.name)
    logger.info(f"Downloaded blob for inference: {blob_path} --> {tmp_file.name}")
    return Path(tmp_file.name)

def upload_json_to_gcs(data: dict, blob_path: str):
    from google.cloud import storage
    import json

    bucket = GCSService.get_bucket()
    blob = bucket.blob(blob_path)
    blob.upload_from_string(json.dumps(data, indent=2), content_type="application/json")

def get_signed_url_from_gcs(blob_path: str, hours_valid: int = 24) -> str:
    """
    Generate a signed URL for a GCS blob valid for the given number of hours.
    """
    from google.cloud import storage
    from datetime import timedelta

    bucket = GCSService.get_bucket()
    blob = bucket.blob(blob_path)

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=hours_valid),
        method="GET"
    )
    return url

def upload_bytes_to_gcs(file_bytes: bytes, blob_path: str, content_type: str = "application/octet-stream"):
    """
    Uploads raw bytes to a blob in GCS using the given path.
    """
    from google.cloud import storage
    import os

    bucket = GCSService.get_bucket()
    blob = bucket.blob(blob_path)
    blob.upload_from_string(file_bytes, content_type=content_type)

def download_json(blob_path: str) -> dict:
    """
    Downloads and parses a JSON file from GCS using its blob path.
    """
    from google.cloud import storage
    bucket = GCSService.get_bucket()
    blob = bucket.blob(blob_path)
    if not blob.exists():
        raise FileNotFoundError(f"Blob not found: {blob_path}")
    content = blob.download_as_string()
    return json.loads(content)

@router.post("/upload-multiple/", response_model=dict)
async def upload_multiple(
    files: List[UploadFile] = File(...),
    session_id: str = Form(...)
):
    try:
        # Load or initialize session metadata
        metadata_path = f"{session_id}/session_metadata.json"
        try:
            metadata = download_json(metadata_path)
            logger.info(f"Loaded existing metadata for session: {session_id}")
        except Exception:
            metadata = {}
            logger.info(f"No existing metadata found for session: {session_id}, starting fresh")

        existing_files = {f["filename"] for f in metadata.get("files", [])}
        new_file_results = []
        results = []
        gcs_blob_paths = []

        # Step 1: Upload raw images to GCS
        for file in files:
            try:
                if not (file.content_type and file.content_type.startswith("image/")):
                    continue
                if file.filename in existing_files:
                    logger.info(f"Skipping duplicate upload: {file.filename}")
                    continue

                content = await file.read()
                validate_file(file, content)

                blob_path = f"{session_id}/images/{file.filename}"
                upload_bytes_to_gcs(content, blob_path, content_type=file.content_type)
                logger.info(f"Uploaded raw image to GCS: {blob_path}")
                gcs_blob_paths.append((file.filename, blob_path))

            except HTTPException:
                raise
            except Exception as err:
                logger.error(f"[Raw Upload Error] {file.filename}: {err}")
                raise HTTPException(status_code=400, detail=f"Raw upload failed for {file.filename}: {err}")

        # Step 2: Download images for model inference
        temp_paths = []
        for filename, blob_path in gcs_blob_paths:
            try:
                temp_paths.append(download_blob_to_tempfile(blob_path))
            except Exception as err:
                logger.error(f"[Download Error] {blob_path}: {err}")
                raise HTTPException(status_code=500, detail=f"Failed to download image for inference: {filename}")

        # Step 3: Run inference
        try:
            detection_results = run_model_on_images(temp_paths, session_id)
            logger.info(f"Model inference completed for {len(temp_paths)} image(s)")
        except Exception as err:
            logger.error(f"[Inference Error]: {err}")
            raise HTTPException(status_code=500, detail=f"Model inference failed: {err}")

        # Step 4: Upload result images and build response
        for idx, ((filename, _), result) in enumerate(zip(gcs_blob_paths, detection_results)):
            try:
                dugong_count, calf_count, image_class, result_image_bytes, label_content, image_name = result
                total_count = dugong_count + 2 * calf_count

                result_blob_path = f"{session_id}/results/{filename}"
                upload_bytes_to_gcs(result_image_bytes, result_blob_path, content_type="image/jpeg")
                signed_url = get_signed_url_from_gcs(result_blob_path)

                # Upload label file to GCS
                label_blob_path = f"{session_id}/labels/{Path(filename).stem}.txt"
                upload_bytes_to_gcs(label_content.encode("utf-8"), label_blob_path, content_type="text/plain")

                file_record = {
                    "filename": filename,
                    "imageUrl": signed_url,
                    "dugongCount": dugong_count,
                    "calfCount": calf_count,
                    "totalCount": total_count,
                    "imageClass": image_class,
                    "createdAt": datetime.utcnow().isoformat()
                }
                new_file_results.append(file_record)

                results.append(ImageResult(
                    imageId=idx,
                    imageUrl=signed_url,
                    dugongCount=dugong_count,
                    calfCount=calf_count,
                    imageClass=image_class,
                    createdAt=file_record["createdAt"]
                ))

                logger.info(f"Uploaded processed image and generated URL: {result_blob_path}")

            except Exception as err:
                logger.error(f"[Result Upload Error] {filename}: {err}")
                raise HTTPException(status_code=500, detail=f"Failed uploading result for {filename}: {err}")

        # Step 5: Update session metadata
        merged_files = metadata.get("files", [])
        existing_filenames = {f["filename"] for f in merged_files}
        # Only append new files that are not already present
        for new_file in new_file_results:
            if new_file["filename"] not in existing_filenames:
                merged_files.append(new_file)
                existing_filenames.add(new_file["filename"])

        updated_metadata = {
            "session_id": session_id,
            "created_at": metadata.get("created_at", datetime.utcnow().isoformat()),
            "last_activity": datetime.utcnow().isoformat(),
            "files": merged_files,
            "file_count": len(merged_files)
        }

        try:
            upload_json_to_gcs(updated_metadata, metadata_path)
            logger.info(f"Updated session metadata in GCS for: {session_id}")
        except Exception as err:
            logger.error(f"[Metadata Upload Error]: {err}")
            raise HTTPException(status_code=500, detail=f"Failed to update session metadata: {err}")

        return {
            "success": True,
            "sessionId": session_id,
            "results": results,
            "filesUploaded": len(new_file_results),
            "files": new_file_results,
            "message": f"Processed {len(new_file_results)} image(s)"
        }

    except HTTPException:
        raise  # Already handled
    except Exception as err:
        logger.error(f"[Unknown Error in upload-multiple]: {err}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {err}")

    
@router.post("/cleanup-sessions/{user_email}")
def cleanup_sessions(user_email: str, session_id: str = Query(None)):
    """
    Deletes all contents of the session folder (images, results, metadata) from GCS
    for the given session_id (or the user's current session_id if not provided).
    Also clears session_id field in MongoDB user document.
    """
    # Load environment and connect to MongoDB
    load_dotenv()
    MONGO_URL = os.getenv("MONGO_URI")
    client = MongoClient(MONGO_URL)
    db = client["DugongMonitoring"]
    user_collection = db["users"]

    # Fetch user document
    user = user_collection.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use provided session_id or fallback to user's session
    session_id_to_delete = session_id or user.get("session_id")
    if not session_id_to_delete:
        raise HTTPException(status_code=400, detail="No session_id provided or found in user document")

    # Delete session folder from GCS
    gcs_result = GCSService.delete_session_folder(session_id_to_delete)

    # Remove session_id from user document
    user_collection.update_one({"email": user_email}, {"$unset": {"session_id": ""}})

    return {
        "session_id": session_id_to_delete,
        "gcs_deleted": gcs_result.get("deleted", False),
        "gcs_file_count": gcs_result.get("file_count", 0),
        "message": "GCS session cleanup completed."
    }

@router.post("/move-to-false-positive/")
async def move_to_false_positive(request: MoveImageRequest):
    try:
        # Always extract the filename without query parameters
        image_name = request.imageName.split("?")[0]
        # Determine opposite classification
        target_class = request.targetClass.lower()
        if target_class == "feeding":
            opposite_class = "resting"
        elif target_class == "resting":
            opposite_class = "feeding"
        else:
            raise HTTPException(status_code=400, detail="Invalid targetClass. Must be 'feeding' or 'resting'.")

        # Move image to false positive folder INSIDE the sessionId
        # Patch: call GCSService.move_image_to_false_positive with a new target path
        # Instead of relying on the default, we do the move manually here
        bucket = GCSService.get_bucket()
        source_path = f"{request.sessionId}/images/{image_name}"
        destination_path = f"{request.sessionId}/False positives/{opposite_class}/{image_name}"
        source_blob = bucket.blob(source_path)
        if not source_blob.exists():
            raise HTTPException(status_code=404, detail=f"Image not found in GCS: {source_path}")
        # Copy the image to the destination path
        bucket.copy_blob(source_blob, bucket, destination_path)
        # Delete the original image
        source_blob.delete()

        # Update session_metadata.json in GCS
        metadata_path = f"{request.sessionId}/session_metadata.json"
        metadata = download_json(metadata_path)

        # Update imageClass in metadata
        updated = False
        for file in metadata.get("files", []):
            if file["filename"] == image_name:
                file["imageClass"] = opposite_class
                file["updatedAt"] = datetime.utcnow().isoformat()
                updated = True
                break

        if not updated:
            raise HTTPException(status_code=404, detail="Image not found in session metadata.")

        # Re-upload updated metadata
        upload_json_to_gcs(metadata, metadata_path)

        return {
            "message": f"Image '{image_name}' moved to '{opposite_class}' in False positives and metadata updated."
        }

    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move image: {str(e)}")
    

@router.post("/backfill-detections/{session_id}")
def backfill_detections(session_id: str):
    """
    Run detection on unprocessed images in GCS session folder and update session_metadata.json.
    """
    metadata_path = f"{session_id}/session_metadata.json"

    try:
        metadata = download_json(metadata_path)
    except FileNotFoundError:
        metadata = {}

    existing_files = metadata.get("files", [])
    existing_filenames = {f["filename"] for f in existing_files}

    bucket = GCSService.get_bucket()
    all_blobs = list(bucket.list_blobs(prefix=f"{session_id}/images/"))
    image_blobs = [b for b in all_blobs if b.name.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]

    unprocessed_blobs = [b for b in image_blobs if Path(b.name).name not in existing_filenames]

    if not unprocessed_blobs:
        return {
            "success": True,
            "message": "All images already have detection results.",
            "files": existing_files,
            "processed_count": 0
        }

    new_files = []

    with tempfile.TemporaryDirectory() as tmpdir:
        temp_paths = []
        for blob in unprocessed_blobs:
            local_path = Path(tmpdir) / Path(blob.name).name
            blob.download_to_filename(str(local_path))
            temp_paths.append(local_path)

        detection_results = run_model_on_images(temp_paths, session_id)

        for result_path, result in zip(temp_paths, detection_results):
            dugong_count, calf_count, image_class, _ = result
            fname = result_path.name
            total_count = dugong_count + 2 * calf_count
            new_files.append({
                "filename": fname,
                "path": f"{session_id}/images/{fname}",
                "dugongCount": dugong_count,
                "calfCount": calf_count,
                "totalCount": total_count,
                "imageClass": image_class,
                "createdAt": datetime.utcnow().isoformat()
            })

    merged_files = existing_files + new_files
    metadata["files"] = merged_files
    metadata["file_count"] = len(merged_files)
    metadata["last_activity"] = datetime.utcnow().isoformat()

    upload_json_to_gcs(metadata, metadata_path)

    logger.info(f"Backfilled {len(new_files)} new image(s) for session {session_id}")

    return {
        "success": True,
        "message": f"Detection results added for {len(new_files)} new image(s).",
        "files": merged_files,
        "processed_count": len(new_files)
    }


@router.get("/session-status/{session_id}")
async def get_session_status(session_id: str):
    """
    Get the current status of a session from GCS including time remaining and file details.
    """
    try:
        metadata_path = f"{session_id}/session_metadata.json"
        metadata = download_json(metadata_path)
        last_activity_str = metadata.get("last_activity")
        if not last_activity_str:
            raise HTTPException(status_code=500, detail="Missing 'last_activity' in session metadata")

        last_activity = datetime.fromisoformat(last_activity_str)
        now = datetime.utcnow()
        elapsed = (now - last_activity).total_seconds()
        remaining_seconds = max(0, 15 * 60 - int(elapsed))  # 15 minutes

        return JSONResponse(content={
            "success": True,
            "sessionId": session_id,
            "lastActivity": last_activity_str,
            "remainingSeconds": remaining_seconds,
            "isExpired": remaining_seconds <= 0,
            "fileCount": metadata.get("file_count", 0),
            "files": metadata.get("files", [])
        })

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session or metadata not found")
    except Exception as e:
        logger.error(f"Failed to get session status for {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get session status: {str(e)}")
    

@router.get("/export-session-csv/{session_id}")
def export_session_csv(session_id: str):
    """
    Export the session metadata (files array) as a downloadable CSV file with capitalized headers.
    Ensures IMAGECLASS is readable (e.g., 'Feeding', 'Resting').
    """
    metadata_path = f"{session_id}/session_metadata.json"

    try:
        metadata = download_json(metadata_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session metadata not found")

    files = metadata.get('files', [])
    if not files:
        raise HTTPException(status_code=404, detail="No files metadata found for this session")

    # Add TOTALCOUNT and ensure IMAGECLASS is readable
    for file in files:
        dugong_count = file.get('dugongCount', 0)
        calf_count = file.get('calfCount', 0)
        file['TOTALCOUNT'] = file.get('totalCount', dugong_count + (2 * calf_count))
        # Normalize imageClass to title-case (e.g., feeding → Feeding)
        if "imageClass" in file:
            file["IMAGECLASS"] = str(file["imageClass"]).capitalize()
    # Gather all fields across all files
    all_fields = set()
    for file in files:
        all_fields.update([k.upper() for k in file.keys()])
    fieldnames = sorted(all_fields)
    # Create in-memory CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()  # Capitalized headers
    for file in files:
        # Map all keys to uppercase for the row
        row = {k.upper(): v for k, v in file.items()}
        # Remove any lowercase keys if present
        for k in list(row.keys()):
            if k.lower() != k:
                row.pop(k.lower(), None)
        writer.writerow(row)
    csv_content = output.getvalue()
    output.close()
    print('DEBUG CSV CONTENT:\n', csv_content, flush=True)  # Debug print to verify headers

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=session_{session_id}_metadata.csv"}
    )