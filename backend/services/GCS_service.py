import os
from google.cloud import storage
from datetime import timedelta

class GCSService:
    BUCKET_NAME = os.getenv("BUCKET_NAME", "dugongstorage")
    KEY_PATH = os.path.join(os.path.dirname(__file__), "key.json")

    @staticmethod
    def get_client():
        if not os.path.exists(GCSService.KEY_PATH):
            raise FileNotFoundError(f"GCS key file not found at {GCSService.KEY_PATH}")
        return storage.Client.from_service_account_json(GCSService.KEY_PATH)

    @staticmethod
    def get_bucket():
        client = GCSService.get_client()
        return client.bucket(GCSService.BUCKET_NAME)

    @staticmethod
    def upload_file(local_path: str, folder_prefix: str, file_name: str, url_expiration_hours: int = 1) -> str:
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Local file not found: {local_path}")

        bucket = GCSService.get_bucket()
        blob_path = f"{folder_prefix.rstrip('/')}/{file_name}"
        blob = bucket.blob(blob_path)
        blob.upload_from_filename(local_path)

        print(f"Uploaded {local_path} to gs://{GCSService.BUCKET_NAME}/{blob_path}")

        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=url_expiration_hours),
            method="GET"
        )
        print(f"Signed URL: {signed_url}")
        return signed_url

    @staticmethod
    def download_file(folder_prefix: str, file_name: str, destination_path: str):
        bucket = GCSService.get_bucket()
        blob_path = f"{folder_prefix.rstrip('/')}/{file_name}"
        blob = bucket.blob(blob_path)
        blob.download_to_filename(destination_path)
        print(f"Downloaded {blob_path} to {destination_path}")

    @staticmethod
    def move_image_to_false_positive(session_id: str, image_name: str, target_class: str):
        bucket = GCSService.get_bucket()
        source_path = f"{session_id}/images/{image_name}"
        destination_path = f"False positives/{target_class}/{image_name}"

        source_blob = bucket.blob(source_path)

        if not source_blob.exists():
            raise FileNotFoundError(f"Image not found in GCS: {source_path}")

        bucket.copy_blob(source_blob, bucket, destination_path)
        source_blob.delete()

    @staticmethod
    def delete_session_folder(session_id: str) -> dict:
        bucket = GCSService.get_bucket()
        prefix = f"{session_id}/"
        blobs = list(bucket.list_blobs(prefix=prefix))
        
        if not blobs:
            return {"deleted": False, "message": f"No files found for session_id: {session_id}"}

        for blob in blobs:
            print(f"Deleting blob: {blob.name}")
            blob.delete()

        return {
            "deleted": True,
            "message": f"All files deleted for session_id: {session_id}",
            "file_count": len(blobs)
        }
