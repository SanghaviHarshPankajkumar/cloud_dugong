"""
Core configuration settings for file handling and model parameters.
"""
from pathlib import Path
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE_MB = 25
MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "model" / "MLmodel.pt"
CLASSIFICATION_MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "model" / "classification_model.pt"