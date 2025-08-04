import shutil
import json
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import JSONResponse
from typing import List
from datetime import datetime
from uuid import uuid4
import uuid
from services.GCS_service import GCSService
from services.file_service import validate_file
from services.model_service import run_model_on_images
from schemas.response import ImageResult
from core.logger import setup_logger
from core.cleanup import update_session_activity
from schemas.request import MoveImageRequest

logger = setup_logger("api", "logs/api.log")
router = APIRouter()

@router.post("/upload-multiple/", response_model=dict)
async def upload_multiple(  
    files: List[UploadFile] = File(...),
    session_id: str = Form(...)
):
    """
    Upload multiple files, save them under a session folder, run YOLO model, and update session metadata.
    Updates session activity timestamp for timer reset.
    """
    try:
        session_folder_name = f"{session_id}"
        # session_folder = BASE_DIR / session_folder_name
        # session_folder.mkdir(parents=True, exist_ok=True)

        results: List[ImageResult] = []
        new_file_results = []
        batch_files = files
        batch_contents = []
        saved_paths = []

        for file in batch_files:
            if file.content_type and file.content_type.startswith("image/"):
                contents = await file.read()
                validate_file(file, contents)
                # saved_path = save_file(file, contents, session_folder_name)
                batch_contents.append((file, contents))
                # saved_paths.append(saved_path)

        batch_results = run_model_on_images(saved_paths, session_folder_name)

        for idx, (saved_path, result) in enumerate(zip(saved_paths, batch_results)):
            dugong_count, calf_count, image_class, image_with_boxes_path = result

            # Upload image to GCS and get signed URL
            gcs_url = GCSService.upload_file(
                local_path=str(saved_path),
                folder_prefix=f"{session_folder_name}/images",
                file_name=saved_path.name,
                url_expiration_hours=24  # or desired duration
            )

            file_result = {
                "filename": saved_path.name,
                "path": saved_path.name,
                "dugongCount": dugong_count,
                "calfCount": calf_count,
                "imageClass": image_class,
                "createdAt": datetime.now().isoformat()
            }

            new_file_results.append(file_result)

            results.append(ImageResult(
                imageId=idx,
                imageUrl=gcs_url,  # Replaces local path with signed GCS URL
                dugongCount=dugong_count,
                calfCount=calf_count,
                imageClass=image_class,
                createdAt=file_result["createdAt"]
            ))
        # Update or create session metadata
        
        metadata_path = f"{session_folder_name}/session_metadata.json"
        merged_files = []

        if GCSService.file_exists(metadata_path):
            metadata_content = GCSService.read_file(metadata_path)
            metadata = json.loads(metadata_content)

            old_files = metadata.get('files', [])
            # Build a dict of new results for quick lookup
            new_files_dict = {f['filename']: f for f in new_file_results}

            for old_file in old_files:
                fname = old_file.get('filename')
                if fname in new_files_dict:
                    # Overwrite with new detection result
                    merged_files.append(new_files_dict[fname])
                else:
                    # Keep old file info; default values if detection missing
                    merged_files.append({
                        **old_file,
                        "dugongCount": old_file.get("dugongCount", 0),
                        "calfCount": old_file.get("calfCount", 0),
                        "imageClass": old_file.get("imageClass", "N/A"),
                        "createdAt": old_file.get("createdAt", datetime.now().isoformat())
                    })

            # Add any new files not present previously
            for fname, new_file in new_files_dict.items():
                if not any(f.get('filename') == fname for f in old_files):
                    merged_files.append(new_file)
        else:
            # First time writing metadata
            merged_files = new_file_results

        metadata = {
            'session_id': session_id,
            'created_at': datetime.utcnow().isoformat(),
            'last_activity': datetime.utcnow().isoformat(),
            'files': merged_files,
            'file_count': len(merged_files)
        }

        GCSService.write_file(metadata_path, json.dumps(metadata, indent=2))

        logger.info(f"Updated session: {session_id} with {len(merged_files)} total files")

        return {
            "success": True,
            "sessionId": session_id,
            "results": results,
            "filesUploaded": len(new_file_results),
            "files": new_file_results,
            "message": f"Successfully uploaded and processed {len(new_file_results)} images"
        }

    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/cleanup-sessions/{user_email}")
def cleanup_sessions(user_email: str, session_id: str = Query(None)):
    """
    Deletes the GCS folder for the given session_id (or the user's current session_id if not provided).
    """
    # Load MongoDB config and connect
    load_dotenv()
    MONGO_URL = os.getenv("MONGO_URI")
    client = MongoClient(MONGO_URL)
    db = client["DugongMonitoring"]
    user_collection = db["users"]

    # Fetch user document
    user = user_collection.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Use provided session_id or fallback to user's
    session_id_to_delete = session_id or user.get("session_id")
    if not session_id_to_delete:
        raise HTTPException(status_code=400, detail="No session_id provided or found in user document")

    # Delete from GCS
    gcs_result = GCSService.delete_session_folder(session_id_to_delete)

    # Remove session_id from user document
    user_collection.update_one({"email": user_email}, {"$unset": {"session_id": ""}})

    return {
        "session_id": session_id_to_delete,
        "gcs_deleted": gcs_result.get("deleted", False),
        "gcs_file_count": gcs_result.get("file_count", 0),
        "message": "GCS session cleanup completed."
    }

@router.get("/session-status/{session_id}")
async def get_session_status(session_id: str):
    """
    Get the current status of a session including time remaining and all files.
    """
    try:
        status = gsc_service.get_session_status(session_id)

        return JSONResponse(content={
            "success": True,
            "sessionId": session_id,
            "lastActivity": status["last_activity"],
            "remainingSeconds": status["remaining_seconds"],
            "isExpired": status["remaining_seconds"] <= 0,
            "fileCount": status["file_count"],
            "files": status["files"]
        })

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Session or metadata not found")
    except Exception as e:
        logger.error(f"Failed to get session status for {session_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get session status: {str(e)}")

@router.post("/move-to-false-positive/")
async def move_to_false_positive(request: MoveImageRequest):
    try:
        GCSService.move_image_to_false_positive(
            session_id=request.sessionId,
            image_name=request.imageName,
            target_class=request.targetClass
        )
        return {
            "message": f"Image '{request.imageName}' moved to '{request.targetClass}' in False positives."
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move image: {str(e)}")
    
@router.post("/backfill-detections/{session_id}")
def backfill_detections(session_id: str):
    """
    Run detection on unprocessed images in the session folder and update session_metadata.json with results.
    Only processes images that don't have detection results yet.
    """
    # session_folder = BASE_DIR / session_id
    # images_dir = session_folder / "images"
    metadata_path = f"{session_id}/session_metadata.json"
    if not GCSService.file_exists(f"{session_id}/images"):
        raise HTTPException(status_code=404, detail="Images directory not found for this session.")
    if not GCSService.file_exists(metadata_path):
        raise HTTPException(status_code=404, detail="Session metadata not found.")
    
    metadata_content = GCSService.read_file(metadata_path)
    metadata = json.loads(metadata_content)
    
    files_metadata = metadata.get('files', [])
    # Build a dict for quick lookup
    files_dict = {f['filename']: f for f in files_metadata}
    
    # Find all image files in the session
    all_image_files = [img for img in GCSService.list_files(f"{session_id}/images") if img.endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    
    # Get list of filenames that are already processed (exist in metadata)
    processed_filenames = set(files_dict.keys())
    
    # Filter out images that are already processed (exist in metadata)
    unprocessed_images = []
    for img_path in all_image_files:
        fname = img_path.name
        # If the filename is not in the metadata, it hasn't been processed yet
        if fname not in processed_filenames:
            unprocessed_images.append(img_path)
    
    if not unprocessed_images:
        return {
            "success": True, 
            "message": "All images already have detection results. No processing needed.", 
            "files": list(files_dict.values()),
            "processed_count": 0
        }
    
    # Run detection only on unprocessed images
    detection_results = run_model_on_images(unprocessed_images, session_id)
    
    for (img_path, result) in zip(unprocessed_images, detection_results):
        dugong_count, calf_count, image_class, _ = result
        fname = img_path.name
        # Update or create metadata entry
        files_dict[fname] = {
            **files_dict.get(fname, {}),
            "filename": fname,
            "path": fname,
            "dugongCount": dugong_count,
            "calfCount": calf_count,
            "imageClass": image_class,
            "createdAt": files_dict.get(fname, {}).get("createdAt", datetime.now().isoformat())
        }
    
    # Save updated metadata
    merged_files = list(files_dict.values())
    metadata['files'] = merged_files
    metadata['file_count'] = len(merged_files)
    
    GCSService.write_file(metadata_path, json.dumps(metadata, indent=2))
    
    return {
        "success": True, 
        "message": f"Detection results backfilled for {len(unprocessed_images)} unprocessed images.", 
        "files": merged_files,
        "processed_count": len(unprocessed_images)
    }

