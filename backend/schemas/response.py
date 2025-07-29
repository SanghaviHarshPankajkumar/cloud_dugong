"""
Response schema for dugong image classification results.
Defines the structure of the AI model's output data.
"""

from pydantic import BaseModel

class ImageResult(BaseModel):
    """
    Schema for individual image classification result.
    
    Attributes:
        imageId: Unique identifier for the processed image
        imageUrl: URL to access the processed image
        labelUrl: URL to access the labeled/annotated image
        dugongCount: Number of dugongs detected
        calfCount: Number of calves detected
        imageClass: Classification grade (A/B/C)
        createdAt: Timestamp of processing
    """

    imageId: int
    imageUrl: str
    dugongCount: int
    calfCount: int
    imageClass: str
    createdAt: str