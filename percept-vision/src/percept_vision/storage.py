"""Supabase Storage: upload the MP4, hand back a public URL.

Per Redis guidance, the video bytes never go in Redis — only the URL does.
"""

from __future__ import annotations

import mimetypes
import os

from supabase import create_client


class SupabaseStorage:
    def __init__(self, url: str, key: str, bucket: str):
        self.client = create_client(url, key)
        self.bucket = bucket
        self._ensure_bucket()

    def _ensure_bucket(self):
        try:
            existing = {b.name for b in self.client.storage.list_buckets()}
            if self.bucket not in existing:
                self.client.storage.create_bucket(
                    self.bucket, options={"public": True}
                )
        except Exception:
            # Bucket may already exist or perms differ; uploads will surface real errors.
            pass

    def upload(self, local_path: str, dest_name: str) -> str:
        content_type = mimetypes.guess_type(local_path)[0] or "video/mp4"
        with open(local_path, "rb") as f:
            data = f.read()
        try:
            self.client.storage.from_(self.bucket).upload(
                path=dest_name,
                file=data,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        except Exception as exc:
            # If it already exists, update instead.
            if "exist" in str(exc).lower() or "duplicate" in str(exc).lower():
                self.client.storage.from_(self.bucket).update(
                    path=dest_name,
                    file=data,
                    file_options={"content-type": content_type, "upsert": "true"},
                )
            else:
                raise
        return self.client.storage.from_(self.bucket).get_public_url(dest_name)
