# Percept Vision 🎥 — store videos in Redis, then ask questions about them (MCP)

> The MP4 bytes live in object storage. The **understanding** lives in Redis — and that's what you query.

`pip install percept-vision-plugin` gives any agent the ability to **ingest a video**, run
**computer vision** over it (OpenCV frame sampling + **YOLO** object detection + **CLIP**
embeddings), and store the result in **Redis** — so you can **find the exact moment**
something happens, **list what objects appear**, and **ask natural-language questions**
about your video library. Exposed over the **Model Context Protocol (MCP)**.

It's the multimodal layer of [Percept Context](../percept-context) — video becomes
first-class, searchable nodes alongside your context graph, all in one Redis.

---

## Why this exists

Redis's vector stack is **text-only** — every shipping RedisVL vectorizer is a `…Text…`
class; there's no image/video vectorizer, no frame-level search, no media model. And per
Redis's own guidance, you **shouldn't** put MP4 bytes in Redis. Percept Vision does it the
right way:

| Concern | How |
| --- | --- |
| Video bytes | **Supabase Storage** → a public URL (Redis never holds the file) |
| Frame understanding | **OpenCV** samples frames; **YOLO** detects objects; **CLIP** embeds them |
| Searchable index | **RedisVL** vector index of CLIP frame vectors (`percept_frames`) |
| "Find the moment" | CLIP text→image search returns timestamped, deep-linkable moments |
| "What's in it" | YOLO detections aggregated per video |
| "Ask about it" | retrieved frames + detections → optional LLM answer with timestamps |

---

## Pipeline

```
  ingest_video(path|url)
        │
        ├─►  Supabase Storage  ──►  public MP4 URL ─────────────┐
        │                                                       │
        └─►  OpenCV sample frames                               │
                 ├─►  YOLO  ──►  objects per frame              ▼
                 └─►  CLIP  ──►  512-d vector ──►  R E D I S  (percept_frames index)
                                                   pv:video:{id}  +  pv:frame:{id}
        ┌───────────────────────────────────────────────────────────────────────┐
   search_moments("a person holding a phone")  → CLIP text vector → top frames
   ask_video("what happens at the end?")       → frames + detections → answer
   list_video_objects(id)                      → {person: 12, laptop: 4, ...}
```

---

## Install

Requires Python ≥ 3.10, a Redis with the Search module (Redis Stack / Redis 8 / Redis Cloud),
and a Supabase project. First run downloads YOLOv8n (~6 MB) and CLIP ViT-B-32 (~600 MB).

```bash
pip install percept-vision-plugin
```

Configure (`.env` or env vars):

```bash
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key   # bypasses RLS for uploads
SUPABASE_BUCKET=percept-videos               # public bucket
REDIS_URL=redis://localhost:6379
REDIS_PROTOCOL=2
```

Try it:

```bash
python examples/quickstart.py /path/to/video.mp4
```

---

## Register with Claude Code

```bash
claude mcp add percept-vision --scope local \
  --env SUPABASE_URL=... --env SUPABASE_SERVICE_KEY=... --env SUPABASE_BUCKET=percept-videos \
  --env REDIS_URL=redis://localhost:6379 --env REDIS_PROTOCOL=2 \
  -- percept-vision
```

---

## Tools

| Tool | What it does |
| --- | --- |
| `ingest_video(source, video_id?)` | Upload + CV-analyze a video (path or URL) into Redis. |
| `search_moments(query, k?, video_id?)` | Find moments matching a phrase → timestamps + deep links + objects. |
| `ask_video(question, video_id?, k?)` | Q&A over retrieved frames (LLM answer if `ANTHROPIC_API_KEY` set). |
| `list_video_objects(video_id)` | YOLO object counts for a video. |
| `list_videos()` | All ingested videos. |
| `vision_stats()` | Redis health + video count. |

---

## Configuration reference

| Env var | Default | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | – (required) | Object storage for MP4s. |
| `SUPABASE_BUCKET` | `percept-videos` | Public bucket name. |
| `REDIS_URL` / `REDIS_PROTOCOL` | `redis://localhost:6379` / `2` | Redis with Search. |
| `PERCEPT_YOLO_MODEL` | `yolov8n.pt` | Ultralytics model. |
| `PERCEPT_CLIP_MODEL` | `clip-ViT-B-32` | CLIP model (image+text). |
| `PERCEPT_FRAME_INTERVAL` | `1.0` | Seconds between sampled frames. |
| `PERCEPT_MAX_FRAMES` | `60` | Cap on frames per video. |
| `ANTHROPIC_API_KEY` | – | Enables written answers in `ask_video`. |

## License

MIT
