"""
YOLOv8 model service for dugong and calf detection in aerial images.
Handles model inference and detection result processing.
"""

from pathlib import Path
from ultralytics import YOLO
from core.config import MODEL_PATH, CLASSIFICATION_MODEL_PATH
from core.logger import setup_logger
from typing import List, Tuple

import numpy as np
import torch
import os
import cv2
import tempfile

logger = setup_logger("model_service", "logs/model_service.log")
model = YOLO(MODEL_PATH)
classification_model = YOLO(CLASSIFICATION_MODEL_PATH)

def fully_dynamic_nms(preds, iou_min=0.1, iou_max=0.6):
    from ultralytics.engine.results import Boxes

    processed_results = []
    for res in preds:
        if res is None or not len(res.boxes):
            processed_results.append(res)
            continue

        boxes = res.boxes.xyxy.cpu()
        scores = res.boxes.conf.cpu()
        cls = res.boxes.cls.cpu() if hasattr(res.boxes, 'cls') else torch.zeros_like(scores)

        if boxes.numel() == 0:
            processed_results.append(res)
            continue

        if res.orig_img is not None:
            img_height, img_width = res.orig_img.shape[:2]
        else:
            img_height, img_width = 1, 1

        heights = boxes[:, 3] - boxes[:, 1]
        widths = boxes[:, 2] - boxes[:, 0]
        sizes = torch.sqrt(heights * widths)
        median_size = float(torch.median(sizes))
        min_size, max_size = 10, 200
        clipped_size = np.clip(median_size, min_size, max_size)
        relative_size = (clipped_size - min_size) / (max_size - min_size)
        iou_thr = iou_max - relative_size * (iou_max - iou_min)
        print(f"[{os.path.basename(res.path)}] Median size: {median_size:.2f}, IoU: {iou_thr:.3f}, Relative size : {relative_size}")
        keep = torch.ops.torchvision.nms(boxes, scores, float(iou_thr))

        kept_boxes = boxes[keep]
        kept_scores = scores[keep].unsqueeze(1)
        kept_cls = cls[keep].unsqueeze(1)
        final_data = torch.cat([kept_boxes, kept_scores, kept_cls], dim=1).to(res.boxes.data.device)

        res.boxes = Boxes(final_data, orig_shape=res.orig_shape)
        processed_results.append(res)

    return processed_results

def run_model_on_images(
    image_paths: List[Path], session_id: str
) -> List[Tuple[int, int, str, bytes, str, str]]:
    """
    Run dugong detection model on a batch of images and return detection results as bytes and label content.
    """
    results = []
    logger.info(f"Running model on batch: {[str(p) for p in image_paths]}")
    # 1. Perform prediction to get the initial results
    batch_results = model.predict(
        source=[str(p) for p in image_paths],
        conf=0.3,
        save=False,
        show_labels=False,
        show_conf=False,
        project=None,
        name=None,
        iou=0.3,
        max_det=1000
    )

    # 2. Apply the custom NMS function to the results
    processed_results = fully_dynamic_nms(batch_results)

    # Define colors for classes (B, G, R)
    color_map = {
        0: (255, 0, 0),   # Blue for Dugong (class 0)
        1: (0, 0, 255)    # Red for Calf (class 1)
    }

    for image_path, res in zip(image_paths, processed_results):
        class_ids = res.boxes.cls.int().tolist() if res.boxes is not None else []
        dugong_count = class_ids.count(0)
        calf_count = class_ids.count(1)
        # find the class of the image
        temp_results = classification_model.predict(image_path,  save=False,show_conf=False,project=None)
        top5_class_names = temp_results[0].names
        top1_class_id = temp_results[0].probs.top1
        image_class = top5_class_names[top1_class_id]
        label_content = ""
        for box, cls_id in zip(res.boxes.xywhn, res.boxes.cls.int()):
            cx, cy, w, h = box.tolist()
            label_content += f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n"

        # Draw bounding boxes on the image in memory
        img = cv2.imread(str(image_path))
        if img is not None and len(res.boxes) > 0:
            boxes = res.boxes.xyxy.cpu().numpy()
            classes = res.boxes.cls.cpu().numpy().astype(int)
            for box, cls in zip(boxes, classes):
                x1, y1, x2, y2 = map(int, box)
                color = color_map.get(cls, (0, 255, 0))
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        # Encode image to bytes in memory
        _, img_encoded = cv2.imencode('.jpg', img)
        image_bytes = img_encoded.tobytes()
        results.append((dugong_count, calf_count, image_class, image_bytes, label_content, image_path.name))

    return results
