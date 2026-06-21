"""Configuration. Loads .env and .env.local from the cwd up to the repo root."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def _load_env() -> None:
    here = Path.cwd()
    for d in [here, *here.parents]:
        for name in (".env", ".env.local"):
            f = d / name
            if f.exists():
                load_dotenv(f, override=False)
        if (d / ".git").exists():
            break


_load_env()


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_key: str
    supabase_bucket: str
    redis_url: str
    redis_protocol: int
    yolo_model: str
    clip_model: str
    frame_interval: float
    max_frames: int
    frame_index: str
    llm_model: str


def load_settings() -> Settings:
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set "
            "(in .env / .env.local). See .env.example."
        )
    return Settings(
        supabase_url=url,
        supabase_key=key,
        supabase_bucket=os.environ.get("SUPABASE_BUCKET", "percept-videos"),
        redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379"),
        redis_protocol=int(os.environ.get("REDIS_PROTOCOL", "2")),
        yolo_model=os.environ.get("PERCEPT_YOLO_MODEL", "yolov8n.pt"),
        clip_model=os.environ.get("PERCEPT_CLIP_MODEL", "clip-ViT-B-32"),
        frame_interval=float(os.environ.get("PERCEPT_FRAME_INTERVAL", "1.0")),
        max_frames=int(os.environ.get("PERCEPT_MAX_FRAMES", "60")),
        frame_index=os.environ.get("PERCEPT_FRAME_INDEX", "percept_frames"),
        llm_model=os.environ.get("PERCEPT_LLM_MODEL", "claude-opus-4-8"),
    )
