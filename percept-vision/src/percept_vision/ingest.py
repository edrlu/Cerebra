"""VisionStore — the end-to-end pipeline and query surface.

ingest:  video → Supabase (url) → OpenCV frames → YOLO + CLIP → Redis
query:   semantic moment search, object listing, and (optional) LLM Q&A.
"""

from __future__ import annotations

import hashlib
import os
import re
import tempfile
import urllib.request
from collections import Counter

from . import vision
from .config import Settings, load_settings
from .storage import SupabaseStorage
from .store import FrameStore


def _video_id(source: str) -> str:
    """Deterministic id from the source, so re-ingesting the same file/URL is
    idempotent (same id -> upsert frames, reuse the graph node)."""
    base = re.sub(r"[^a-zA-Z0-9]+", "-", os.path.splitext(os.path.basename(source))[0]).strip("-").lower()
    key = os.path.abspath(source) if os.path.exists(source) else source
    digest = hashlib.sha1(key.encode()).hexdigest()[:8]
    return (base or "video")[:40] + "-" + digest


class VisionStore:
    def __init__(self, settings: Settings | None = None):
        self.s = settings or load_settings()
        self._ready = False

    def _ensure(self):
        if self._ready:
            return
        # Load CLIP once to learn its dimensionality, then wire up Redis + storage.
        clip = vision._clip(self.s.clip_model)
        dims = int(clip.get_sentence_embedding_dimension())
        self.frames = FrameStore(self.s, dims)
        self.storage = SupabaseStorage(self.s.supabase_url, self.s.supabase_key, self.s.supabase_bucket)
        self._ready = True

    # --------------------------------------------------------------- ingest
    def ingest(self, source: str, video_id: str | None = None, link_graph: bool = True) -> dict:
        self._ensure()
        local_path, cleanup = self._resolve(source)
        try:
            vid = video_id or _video_id(source)
            dest = f"{vid}.mp4"
            url = self.storage.upload(local_path, dest)

            meta, frames = vision.probe_and_sample(local_path, self.s.frame_interval, self.s.max_frames)
            dets = vision.detect_objects(frames, self.s.yolo_model)
            embs = vision.embed_frames(frames, self.s.clip_model)

            rows = []
            all_objects = Counter()
            for i, ((t, frame), det, emb) in enumerate(zip(frames, dets, embs)):
                classes = [d["class"] for d in det]
                all_objects.update(classes)
                rows.append(
                    {
                        "id": f"{vid}:{i}",
                        "video_id": vid,
                        "objects": classes,
                        "t": t,
                        "url": url,
                        "thumb": vision.thumbnail(frame),
                        "embedding": emb,
                    }
                )

            self.frames.add_video(
                {
                    "id": vid,
                    "url": url,
                    "filename": os.path.basename(source),
                    "duration": meta["duration"],
                    "fps": meta["fps"],
                    "width": meta["width"],
                    "height": meta["height"],
                    "frames_sampled": meta["frames_sampled"],
                    "objects": ", ".join(sorted(all_objects)),
                }
            )
            self.frames.add_frames(rows)
            self.frames.add_object_counts(vid, dict(all_objects))

            summary = {
                "video_id": vid,
                "url": url,
                "filename": os.path.basename(source),
                "duration": meta["duration"],
                "frames_indexed": len(rows),
                "objects_detected": dict(all_objects.most_common()),
            }
            if link_graph:
                from . import graph_link

                summary["context_graph"] = graph_link.register_video(summary)
            return summary
        finally:
            if cleanup:
                try:
                    os.unlink(local_path)
                except OSError:
                    pass

    def _resolve(self, source: str):
        if source.startswith(("http://", "https://")):
            fd, tmp = tempfile.mkstemp(suffix=".mp4")
            os.close(fd)
            urllib.request.urlretrieve(source, tmp)
            return tmp, True
        if not os.path.exists(source):
            raise FileNotFoundError(source)
        return source, False

    # ---------------------------------------------------------------- query
    def search_moments(self, query: str, k: int = 6, video_id: str | None = None):
        self._ensure()
        qv = vision.embed_text(query, self.s.clip_model)
        return self.frames.search(qv, k=k, video_id=video_id)

    def list_objects(self, video_id: str) -> dict:
        self._ensure()
        v = self.frames.get_video(video_id)
        if not v:
            return {"error": f"unknown video_id {video_id}"}
        counts = {k: int(val) for k, val in (v.get("objects_detected") or {}).items()}
        return {"video_id": video_id, "objects": dict(sorted(counts.items(), key=lambda x: -x[1]))}

    def list_videos(self):
        self._ensure()
        return self.frames.list_videos()

    def stats(self):
        self._ensure()
        return self.frames.stats()

    def ask(self, question: str, video_id: str | None = None, k: int = 6) -> dict:
        self._ensure()
        moments = self.search_moments(question, k=k, video_id=video_id)
        evidence = "\n".join(
            f"- {m['timestamp']} ({m['video_id']}): objects=[{', '.join(m['objects']) or 'none'}], sim={m['similarity']}"
            for m in moments
        )
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return {
                "question": question,
                "moments": moments,
                "note": "Set ANTHROPIC_API_KEY (and pip install 'percept-vision-plugin[llm]') for a written answer.",
            }
        try:
            import anthropic
        except ImportError:
            return {"question": question, "moments": moments, "note": "pip install 'percept-vision-plugin[llm]'"}
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model=self.s.llm_model,
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Answer the question about the video using ONLY this frame evidence "
                        "(CLIP-retrieved moments with YOLO object detections). Cite timestamps.\n\n"
                        f"QUESTION: {question}\n\nEVIDENCE:\n{evidence}"
                    ),
                }
            ],
        )
        answer = "".join(getattr(b, "text", "") for b in msg.content)
        return {"question": question, "answer": answer, "moments": moments}
