from pydantic import BaseModel, Field
from typing import Literal

class MoveImageRequest(BaseModel):
    sessionId: str
    imageName: str
    targetClass: Literal["feeding", "resting"] 