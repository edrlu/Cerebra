"""Percept Vision MCP server (stdio).

Store videos (bytes in Supabase, understanding in Redis) and query them: find
the moment something happens, list detected objects, or ask questions.
"""

from __future__ import annotations

from typing import Any

from mcp.server.fastmcp import FastMCP

from .ingest import VisionStore

store = VisionStore()
mcp = FastMCP("percept-vision")


@mcp.tool()
def ingest_video(source: str, video_id: str = "") -> dict[str, Any]:
    """Ingest a video: upload the MP4 to object storage, run OpenCV frame sampling +
    YOLO object detection + CLIP embeddings, and store the understanding in Redis.

    `source` is a local file path or an http(s) URL to an MP4. Returns the
    video_id, public url, duration, frames indexed, and detected-object counts.
    """
    return store.ingest(source, video_id=video_id or None)


@mcp.tool()
def search_moments(query: str, k: int = 6, video_id: str = "") -> list[dict[str, Any]]:
    """Find the moments across stored videos that best match a natural-language
    query (e.g. "a person holding a phone"). Returns timestamps, deep-link URLs,
    detected objects, and thumbnails, ranked by CLIP similarity. Restrict to one
    video with `video_id`.
    """
    return store.search_moments(query, k=k, video_id=video_id or None)


@mcp.tool()
def ask_video(question: str, video_id: str = "", k: int = 6) -> dict[str, Any]:
    """Ask a question about your video(s). Retrieves the most relevant frames
    (CLIP) with their YOLO detections and, if an Anthropic key is configured,
    returns a written answer citing timestamps; otherwise returns the evidence.
    """
    return store.ask(question, video_id=video_id or None, k=k)


@mcp.tool()
def list_video_objects(video_id: str) -> dict[str, Any]:
    """List the objects YOLO detected in a video, with counts."""
    return store.list_objects(video_id)


@mcp.tool()
def list_videos() -> list[dict[str, Any]]:
    """List all ingested videos (id, filename, duration, url)."""
    return store.list_videos()


@mcp.tool()
def vision_stats() -> dict[str, Any]:
    """Health + size: Redis ping, frame index name, number of videos."""
    return store.stats()


def main():
    mcp.run()


if __name__ == "__main__":
    main()
