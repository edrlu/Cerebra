"""End-to-end Percept Vision demo.

    cd percept-vision
    cp .env.example .env   # set SUPABASE_* and REDIS_URL
    python examples/quickstart.py /path/to/video.mp4
"""

import sys

from percept_vision import VisionStore

source = sys.argv[1] if len(sys.argv) > 1 else None
if not source:
    print("usage: python examples/quickstart.py <video-path-or-url>")
    raise SystemExit(1)

vs = VisionStore()

print(f"Ingesting {source} …")
summary = vs.ingest(source)
print(summary)

vid = summary["video_id"]
print("\nObjects detected:", vs.list_objects(vid))

print("\nSearch: 'a person talking to the camera'")
for m in vs.search_moments("a person talking to the camera", k=3):
    print(f"  {m['timestamp']}  sim={m['similarity']}  objects={m['objects']}  {m['deep_link']}")

print("\nStats:", vs.stats())
