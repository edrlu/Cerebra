"""Percept Vision — video understanding stored in Redis.

The MP4 bytes live in object storage (Supabase); Redis holds the *understanding*:
per-frame CLIP embeddings for semantic search and YOLO object detections, linked
to a deep-linkable video URL. Ask questions about your video library, find the
exact moment something happens, or list what objects appear — all from Redis.
"""

from .config import Settings, load_settings
from .ingest import VisionStore

__all__ = ["Settings", "load_settings", "VisionStore", "__version__"]
__version__ = "0.1.0"
