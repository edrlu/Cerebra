"""Redis layer: a RedisVL vector index of CLIP frame embeddings + video metadata.

The MP4 lives in Supabase; here we store searchable understanding:
  * percept_frames index  — one row per sampled frame (CLIP vector + YOLO tags + ts)
  * pv:video:{id} hash     — video metadata (public url, duration, object summary)
"""

from __future__ import annotations

import numpy as np
import redis
from redis import Redis
from redis.backoff import ExponentialBackoff
from redis.retry import Retry
from redisvl.index import SearchIndex
from redisvl.query import VectorQuery
from redisvl.query.filter import Tag
from redisvl.schema import IndexSchema


def _clients(settings):
    common = dict(
        protocol=settings.redis_protocol,
        socket_timeout=30,
        socket_connect_timeout=15,
        socket_keepalive=True,
        health_check_interval=15,
        retry=Retry(ExponentialBackoff(cap=3.0, base=0.2), retries=5),
        retry_on_error=[redis.exceptions.TimeoutError, redis.exceptions.ConnectionError],
    )
    raw = Redis.from_url(settings.redis_url, decode_responses=False, **common)
    kv = Redis.from_url(settings.redis_url, decode_responses=True, **common)
    return raw, kv


def _to_bytes(vec):
    return np.asarray(vec, dtype=np.float32).tobytes()


class FrameStore:
    def __init__(self, settings, dims: int):
        self.s = settings
        self.dims = dims
        self.raw, self.kv = _clients(settings)
        self.index = self._build_index()

    def _build_index(self) -> SearchIndex:
        schema = IndexSchema.from_dict(
            {
                "index": {"name": self.s.frame_index, "prefix": "pv:frame", "storage_type": "hash"},
                "fields": [
                    {"name": "id", "type": "tag"},
                    {"name": "video_id", "type": "tag"},
                    {"name": "objects", "type": "tag", "attrs": {"separator": "|"}},
                    {"name": "t", "type": "numeric"},
                    {"name": "url", "type": "text"},
                    {"name": "thumb", "type": "text"},
                    {
                        "name": "embedding",
                        "type": "vector",
                        "attrs": {
                            "dims": self.dims,
                            "distance_metric": "cosine",
                            "algorithm": "flat",
                            "datatype": "float32",
                        },
                    },
                ],
            }
        )
        try:
            index = SearchIndex(schema, redis_client=self.raw)
        except TypeError:  # pragma: no cover
            index = SearchIndex(schema)
            index.set_client(self.raw)
        try:
            if not index.exists():
                index.create(overwrite=False)
        except Exception as exc:  # pragma: no cover
            if "already exists" not in str(exc).lower():
                raise
        return index

    # ---------------------------------------------------------------- writes
    def add_video(self, meta: dict):
        vid = meta["id"]
        self.kv.hset(f"pv:video:{vid}", mapping={k: ("" if v is None else str(v)) for k, v in meta.items()})
        self.kv.sadd("pv:videos", vid)

    def add_object_counts(self, video_id: str, counts: dict):
        if counts:
            self.kv.hset(f"pv:video:{video_id}:objects", mapping={k: str(v) for k, v in counts.items()})

    def add_frames(self, rows: list[dict]):
        """rows: dicts with id, video_id, objects(list), t, url, thumb, embedding(list)."""
        payload = []
        for r in rows:
            payload.append(
                {
                    "id": r["id"],
                    "video_id": r["video_id"],
                    "objects": "|".join(sorted(set(r["objects"]))) or "none",
                    "t": float(r["t"]),
                    "url": r["url"],
                    "thumb": r.get("thumb", ""),
                    "embedding": _to_bytes(r["embedding"]),
                }
            )
        if payload:
            self.index.load(payload, id_field="id")

    # ---------------------------------------------------------------- reads
    def search(self, query_vec, k=6, video_id: str | None = None, objects: str | None = None):
        filt = None
        if video_id:
            filt = Tag("video_id") == video_id
        if objects:
            of = Tag("objects") == objects
            filt = of if filt is None else filt & of
        vq = VectorQuery(
            vector=query_vec,
            vector_field_name="embedding",
            return_fields=["id", "video_id", "objects", "t", "url", "thumb"],
            num_results=k,
            filter_expression=filt,
        )
        out = []
        for r in self.index.query(vq):
            t = float(r.get("t") or 0)
            url = r.get("url", "")
            out.append(
                {
                    "video_id": r.get("video_id"),
                    "t": t,
                    "timestamp": _fmt_ts(t),
                    "objects": [o for o in (r.get("objects") or "").split("|") if o and o != "none"],
                    "deep_link": f"{url}#t={int(t)}" if url else "",
                    "thumb": r.get("thumb", ""),
                    "similarity": round(1 - float(r.get("vector_distance") or 0), 4),
                }
            )
        return out

    def get_video(self, video_id: str) -> dict | None:
        data = self.kv.hgetall(f"pv:video:{video_id}")
        if not data:
            return None
        data["objects_detected"] = self.kv.hgetall(f"pv:video:{video_id}:objects")
        return data

    def list_videos(self) -> list[dict]:
        out = []
        for vid in sorted(self.kv.smembers("pv:videos")):
            v = self.kv.hgetall(f"pv:video:{vid}")
            if v:
                out.append({"id": vid, "filename": v.get("filename"), "duration": v.get("duration"), "url": v.get("url")})
        return out

    def stats(self) -> dict:
        out = {"frame_index": self.s.frame_index}
        try:
            out["ping"] = bool(self.kv.ping())
        except Exception as exc:
            out["ping"] = False
            out["error"] = str(exc)
        try:
            out["videos"] = self.kv.scard("pv:videos")
        except Exception:
            out["videos"] = None
        return out


def _fmt_ts(seconds: float) -> str:
    s = int(seconds)
    return f"{s // 60:d}:{s % 60:02d}"
