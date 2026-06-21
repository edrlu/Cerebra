"""Bridge Percept Vision → Percept Context.

Registers an ingested video as a node in the shared context graph (the RAG
pipeline in Redis), with its Supabase URL embedded, and links it to the objects
YOLO detected. After this, `graph_rag_query` on the context graph retrieves the
video — and the node carries the URL you follow back to Supabase to play it.
"""

from __future__ import annotations


def register_video(summary: dict, graph: str | None = None) -> dict:
    try:
        from percept_context import ContextGraph
        from percept_context import load_settings as ctx_settings
    except ImportError:
        return {"linked": False, "reason": "percept-context-plugin not installed"}

    cg = ContextGraph(ctx_settings())
    cg._ensure()  # initialize Redis clients before touching the dedup registry
    objs = summary.get("objects_detected", {}) or {}
    obj_str = ", ".join(f"{k} ({v})" for k, v in objs.items()) or "no objects"
    name = summary.get("filename") or summary["video_id"]
    url = summary["url"]

    content = (
        f"Video '{name}' ({summary.get('duration')}s). "
        f"Detected objects: {obj_str}. "
        f"Stored in Redis; play from Supabase: {url}"
    )
    props = {
        "url": url,
        "video_id": summary["video_id"],
        "duration": summary.get("duration"),
        "frame_index": "percept_frames",
        "objects": obj_str,
    }
    # Dedup the video node: one node per video_id, reused on re-ingest
    # (video_id is deterministic, so url/content are identical on re-ingest).
    registry = f"pv:video_nodes:{cg._g(graph)}"
    video_node = cg.kv.hget(registry, summary["video_id"])
    if not video_node:
        video_node = cg.add_node("video", name, content, props=props, graph=graph)
        cg.kv.hset(registry, summary["video_id"], video_node)

    linked = []
    for obj, count in objs.items():
        obj_node = _object_node(cg, graph, obj)
        cg.link(video_node, obj_node, "CONTAINS", weight=float(count), graph=graph)
        linked.append(obj)

    return {"linked": True, "video_node": video_node, "url": url, "objects_linked": linked}


def _object_node(cg, graph, cls: str) -> str:
    """Reuse one shared node per object class (dedup), keyed in a registry hash."""
    registry = f"pv:object_nodes:{cg._g(graph)}"
    existing = cg.kv.hget(registry, cls)
    if existing:
        return existing
    node_id = cg.add_node(
        "object", cls, f"Object class '{cls}' appears in stored videos.", graph=graph
    )
    cg.kv.hset(registry, cls, node_id)
    return node_id
