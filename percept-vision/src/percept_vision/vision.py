"""Computer-vision understanding of a video: OpenCV sampling + YOLO + CLIP.

  * OpenCV samples frames at a fixed interval (bounded by max_frames).
  * YOLO (ultralytics) detects objects per frame.
  * CLIP (sentence-transformers, shared image/text space) embeds each frame so
    natural-language queries can find the matching moment.
"""

from __future__ import annotations

import base64
from functools import lru_cache
from io import BytesIO

import cv2
import numpy as np
from PIL import Image


@lru_cache(maxsize=1)
def _yolo(model_name: str):
    from ultralytics import YOLO

    return YOLO(model_name)


@lru_cache(maxsize=1)
def _clip(model_name: str):
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(model_name)


def probe_and_sample(path: str, interval: float, max_frames: int):
    """Return (meta, frames) where frames is a list of (t_seconds, bgr_ndarray)."""
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = round(total / fps, 2) if fps else 0.0
    step = max(1, int(round(fps * interval)))

    frames = []
    idx = 0
    width = height = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if idx % step == 0:
            height, width = frame.shape[:2]
            frames.append((round(idx / fps, 2), frame))
            if len(frames) >= max_frames:
                break
        idx += 1
    cap.release()
    meta = {
        "fps": round(fps, 2),
        "duration": duration,
        "width": width,
        "height": height,
        "frames_sampled": len(frames),
    }
    return meta, frames


def detect_objects(frames, model_name: str, conf: float = 0.35):
    """Return a list (parallel to frames) of [{class, conf}] detections."""
    model = _yolo(model_name)
    names = model.names
    per_frame = []
    for _, frame in frames:
        res = model.predict(frame, verbose=False, conf=conf)[0]
        dets = []
        if res.boxes is not None and len(res.boxes):
            for c, cf in zip(res.boxes.cls.tolist(), res.boxes.conf.tolist()):
                dets.append({"class": names[int(c)], "conf": round(float(cf), 3)})
        per_frame.append(dets)
    return per_frame


def embed_frames(frames, model_name: str):
    """CLIP-embed each frame (RGB). Returns list[list[float]] (512-dim)."""
    model = _clip(model_name)
    images = [Image.fromarray(cv2.cvtColor(f, cv2.COLOR_BGR2RGB)) for _, f in frames]
    if not images:
        return []
    vecs = model.encode(images, batch_size=16, convert_to_numpy=True, show_progress_bar=False)
    return [v.astype(np.float32).tolist() for v in vecs]


def embed_text(query: str, model_name: str):
    model = _clip(model_name)
    v = model.encode([query], convert_to_numpy=True, show_progress_bar=False)[0]
    return v.astype(np.float32).tolist()


def thumbnail(frame_bgr, max_side: int = 160) -> str:
    """Small base64 JPEG of a frame for previews."""
    h, w = frame_bgr.shape[:2]
    scale = max_side / max(h, w)
    if scale < 1:
        frame_bgr = cv2.resize(frame_bgr, (int(w * scale), int(h * scale)))
    img = Image.fromarray(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=70)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
