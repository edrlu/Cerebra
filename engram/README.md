# Engram 🧠 — a Redis-native Context Graph + GraphRAG engine (MCP)

> An *engram* is the physical trace a memory leaves in the brain.
> Engram is that trace for your knowledge — a queryable **context graph that lives inside Redis** and learns from outcomes.

Engram turns Redis into a **reward-weighted property graph** and exposes it over the
**Model Context Protocol (MCP)**, so any agent (Claude Code, Claude Desktop, your own)
can store knowledge, run **GraphRAG** retrieval, and **close the loop** by reinforcing
what actually performed.

It ships with a curated video-ad knowledge graph, but the engine is domain-agnostic.

---

## Why this exists

Redis is the obvious substrate for AI memory — but two things are missing from the stack today:

1. **No graph.** Redis retired RedisGraph (end-of-support **Jan 31, 2025**) and shipped no
   replacement; the official AI recipes are all *flat* vector RAG. There's no first-class
   way to model entities + relationships and do **GraphRAG** on Redis.
2. **No learning loop.** `SemanticCache` returns *a* prior answer, never the *best-performing*
   one — there's no notion of a reward signal feeding back into retrieval.

Engram fills both, natively on Redis primitives:

| Concern | How Engram does it |
| --- | --- |
| Nodes + embeddings | Redis hashes indexed by **RedisVL** (`SearchIndex`, cosine vector field) |
| Edges + weights | Redis **sorted sets** (`member=neighbor, score=weight`) → O(log n) "best neighbors first" |
| Semantic retrieval | RedisVL `VectorQuery` finds entry nodes |
| **GraphRAG** | vector entry → **beam traversal of highest-weight edges** → connected subgraph |
| **Learning** | `record_outcome(path, reward)` → `ZINCRBY` edge weights + bump node scores |
| Multi-tenant | every key namespaced by a `graph` id → a **shared** graph *and* per-user **personal** graphs |

---

## Architecture

```
          add_node / link_nodes                 record_outcome(path, reward)
                  │                                        ▲
                  ▼                                        │ (e.g. TRIBE score)
   ┌──────────────────────────────────────────────────────────────────┐
   │                          R E D I S                                 │
   │                                                                    │
   │  Nodes (hash + vector, RedisVL SearchIndex)   Edges (sorted sets)  │
   │  engram:node:{graph}:{uuid}                   engram:adj:{graph}:…  │
   └──────────────────────────────────────────────────────────────────┘
                  ▲                                        │
                  │ 1. VectorQuery → entry nodes           │ 2. ZREVRANGE → top-weight
                  │                                         ▼   neighbors (beam traversal)
              graph_rag_query(brief) ───────────────► grounded subgraph + context
```

Retrieval is **semantic + structural**: vectors find *where to enter* the graph; weighted
edges decide *what proven context to pull in*. Outcomes reinforce the edges, so the graph
gets better at retrieval over time.

---

## Install

Requires Python ≥ 3.10 and a Redis with the Search/Query module
(**Redis Cloud**, **Redis Stack**, or **Redis 8**). First run downloads a small local
embedding model (MiniLM, 384-dim) — no API key needed.

```bash
cd engram
python -m venv .venv && source .venv/bin/activate
pip install -e .
```

Configure your connection:

```bash
cp .env.example .env
# edit .env → set REDIS_URL (and REDIS_PROTOCOL=3 for Redis Cloud)
```

Verify end-to-end against your Redis:

```bash
python examples/quickstart.py
```

---

## Register with Claude Code

```bash
claude mcp add engram --scope local -- \
  /absolute/path/to/engram/.venv/bin/engram-mcp
```

Pass the connection via env if you don't use a `.env` file:

```bash
claude mcp add engram --scope local \
  --env REDIS_URL=redis://default:<pwd>@<host>.redis.io:<port> \
  --env REDIS_PROTOCOL=3 \
  -- /absolute/path/to/engram/.venv/bin/engram-mcp
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "engram": {
      "command": "/absolute/path/to/engram/.venv/bin/engram-mcp",
      "env": {
        "REDIS_URL": "redis://default:<pwd>@<host>.redis.io:<port>",
        "REDIS_PROTOCOL": "3"
      }
    }
  }
}
```

> 🔒 **Never commit your real `REDIS_URL`.** `.env` is git-ignored; use `.env.example` as the template.

---

## Tools

| Tool | What it does |
| --- | --- |
| `graph_rag_query(query, graph?, types?, k?, hops?)` | **The core.** Vector-entry + weighted traversal → grounded subgraph + `context`. |
| `search_nodes(query, graph?, types?, k?)` | Pure semantic vector search (no traversal). |
| `add_node(type, label, content?, props?, graph?)` | Add + embed + index a node. |
| `link_nodes(src_id, dst_id, type, weight?, props?, graph?)` | Create a weighted directed edge. |
| `neighbors(node_id, edge_type?, direction?, graph?, limit?)` | Highest-weight neighbors of a node. |
| `record_outcome(path, reward, graph?)` | **Close the loop:** reinforce a winning path. |
| `top_performers(graph?, types?, limit?)` | Most-reinforced nodes. |
| `graph_stats(graph?)` | Ping, index, node count, endpoint. |
| `seed_demo_graph(graph?)` | Load the bundled video-ad knowledge graph. |
| `compose_brief(brief, graph?, k?, hops?)` | Full RAG: retrieve context, then (optional LLM) compose an optimized ad prompt. |

### Shared vs. personal graphs

Every tool takes an optional `graph` namespace:

- `graph` omitted → the **shared** graph (`ENGRAM_DEFAULT_GRAPH`, default `"shared"`).
- `graph="user:dean"` → that user's **personal** graph, isolated by key prefix.

Query the shared graph for curated, proven knowledge; query a personal graph for
what *that* user's own outcomes have taught the system. They live side-by-side in one Redis.

---

## Example session (inside an agent)

```
seed_demo_graph()
graph_rag_query("energy drink ad that stops the scroll", k=3, hops=1)
  → entry: [technique] Pattern interrupt, [principle] Hook in the first second …
  → edges: Hook in the first second —[ENABLES w=2.00]→ Pattern interrupt …
record_outcome(path=[<hook_id>, <pattern_interrupt_id>], reward=8.5)   # a TRIBE score
graph_rag_query("energy drink ad that stops the scroll")              # now biased to the winner
```

---

## Configuration reference

| Env var | Default | Purpose |
| --- | --- | --- |
| `REDIS_URL` | – (required) | Redis connection string. |
| `REDIS_PROTOCOL` | `2` | Use `3` for Redis Cloud / RESP3. |
| `ENGRAM_INDEX` | `engram_nodes` | RediSearch index name. |
| `ENGRAM_PREFIX` | `engram:node` | Node key prefix. |
| `ENGRAM_DEFAULT_GRAPH` | `shared` | Default namespace. |
| `ENGRAM_VECTORIZER` | `hf` | `hf` (local) or `openai`. |
| `ENGRAM_EMBED_MODEL` | `…all-MiniLM-L6-v2` | Embedding model. |
| `ANTHROPIC_API_KEY` | – | Enables LLM composition in `compose_brief`. |
| `ENGRAM_LLM_MODEL` | `claude-opus-4-8` | Model for `compose_brief`. |

---

## Roadmap

- **Plugin 2 — multimodal video nodes:** store videos *in* Redis, run computer vision to
  understand their content, and query them semantically — folding video understanding into
  this same graph as first-class nodes.

## License

MIT
