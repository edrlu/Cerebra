# Terac human rating — one-shot ad scoring

Cerebra generates a short-form ad (Studio → Pika/Seedance). This integration puts
a **real human number** on that ad: it opens a *rating round* and recruits people
through **Terac** to watch the ad and score it 1–5. The aggregate human score is
shown live in the Studio, and the verdict (score + recurring notes) can be folded
back into the brief to drive the next rewrite.

```
generated ad ─▶ /api/rate (open round) ─▶ /rate?round=<id>  (Terac people score 1–5)
                                                   │
                                       /api/rate/submit ─▶ rate/<id>/ratings.jsonl
                                                   │
                              live human score in Studio ──▶ "Refine brief from feedback"
                                                                       │
                                                              optimizer rewrite
```

This replaces the old pairwise "arena" + Bradley-Terry weight-fitting. There is no
Redis, no weight calibration, no separate voting app — just a single-ad rating and
a feedback loop.

## Pieces

| File | Role |
|---|---|
| `app/lib/terac.ts` | File-backed round + ratings store (`rate/<id>/`), aggregation |
| `app/api/rate/route.ts` | `POST {action:"create"\|"launch"}`, `GET ?round=<id>` (live aggregate) |
| `app/api/rate/submit/route.ts` | `POST` one 1–5 rating (JSON or form) |
| `app/rate/page.tsx` | Public single-ad rating task — the URL Terac points participants at |
| `app/components/Studio.tsx` | "HUMAN RATING · TERAC" panel: open round, copy link, live score, refine |
| `.mcp.json` | `terac` MCP server (`x-api-key: ${TERAC_API_KEY}`) |

## Connect the Terac MCP

`.mcp.json` already references the server; supply the key in your environment
(generate one under Terac → Settings → API Keys; keys start with `tk_`):

```bash
export TERAC_API_KEY=tk_your_api_key
```

Or add it at the CLI scope: `claude mcp add --transport http terac https://terac.com/api/mcp --header "x-api-key: tk_..."`.
Verify with `claude mcp list` (or `/mcp`) — `terac` should show connected with a
non-zero tool count. First call: ask the agent to "get my Terac org context"
(`terac_get_context`) — it returns your org name and credit balance.

## Run it

1. In the **Studio** tab, optimize a brief and **Generate** an ad (Pika/Seedance).
2. Under the player, click **Collect human ratings** → opens a round and shows the
   public link `…/rate?round=<id>`. (Deploy the app, or expose it, so participants
   can reach that URL.)
3. **Recruit raters on Terac** flags the round. The actual launch is **agent-driven**
   (below) so a paid round is never started unattended.
4. As ratings land, the panel shows the live human score (0–100) and rater count.
5. **Refine brief from this feedback** appends the human verdict + notes to the brief
   and re-runs the optimizer.

## Launch a round on Terac (agent runbook)

The Terac MCP tools are only callable by an agent (Codex/Claude with the MCP
connected). Drive them in order — review the price quote and smoke-test before any
full paid launch:

1. `terac_get_context` — confirm org + remaining credit balance.
2. `terac_create_project` — group the work (e.g. "Cerebra ad ratings").
3. `terac_create_opportunity` — create it as a **DRAFT** (free) and read the price quote:
   - `task_url` = your deployed `…/rate?round=<id>` (from the Studio panel)
   - `duration_minutes: 5`, `num_participants: 25`, `business_type: "b2c"`,
     `review_type: "self_report"`.
4. `terac_launch_draft_opportunity` — **smoke-test with `num_participants: 3` first**;
   open the task URL with Terac's appended `?submissionId=…&taskId=…` and confirm the
   ad plays and a rating posts. Then launch the full round.
5. Poll `terac_get_submissions`; pause/resume as needed.

**Budget:** ~$5.50 per 5-minute participant. A round of 25 ≈ ~$140. The rating task
is ~1 minute, so consider a shorter `duration_minutes` to lower cost.

## Storage

`rate/<id>/round.json` (round metadata + Terac launch state) and
`rate/<id>/ratings.jsonl` (one rating per line). The `rate/` dir is gitignored
scratch, like `regen/`.
