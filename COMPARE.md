# Terac pairwise A/B — per-dimension ad comparison

The comparative sibling of the one-shot `/rate` flow (see `TERAC.md`). Instead of
"score this one ad 1–5", a Terac participant is shown **two** ads and asked, for
each engagement dimension, **which one** — the exact questions TRIBE's four
families answer:

| Dimension | Question (the vote label) |
|---|---|
| **Overall** | Which one are you more into — which would you keep watching? |
| **AUD** — auditory | Which one caught your ear more? |
| **LANG** — language | Which one made more sense / landed its message better? |
| **ATTN** — attention | Which one held your attention? |
| **VIS** — visual/motion | Which one were you watching more closely? |

Because TRIBE gives each clip a per-family score, the **model also has a predicted
pick for every question**. That's the eval: model picks vs human picks.

```
two ads + TRIBE scores ─▶ /api/compare (create matchup, model picks computed)
                              │
                  /compare?round=<id>   (Terac people vote per question)
                              │
                  /api/compare/submit ─▶ compare/<id>/votes.jsonl
                              │
              /compare/results?round=<id>  ── model-vs-human per question
                                          └─ BEFORE/AFTER: equal-weighted vs
                                             weights LEARNED from human votes
```

## Pieces

| File | Role |
|---|---|
| `app/lib/arena.ts` | Matchup + votes store (`compare/<id>/`), model picks, aggregate, pooled before/after weight-fit |
| `app/api/compare/route.ts` | `POST {action:"create"\|"launch"}`, `GET ?round=<id>` (aggregate) / `GET ?eval=1` (pooled) |
| `app/api/compare/submit/route.ts` | `POST` one per-dimension vote |
| `app/compare/page.tsx` | Public A/B voting task — the URL Terac points participants at |
| `app/compare/results/page.tsx` | Model-vs-human per question + before/after accuracy + learned weights |

## Create a matchup

Each clip needs its TRIBE scores. Get them from the worker `POST /predict`
(`regions[].score` per family + `engagementScore`), then:

```bash
curl -s localhost:3000/api/compare -X POST -H 'content-type: application/json' -d '{
  "action": "create",
  "a": { "label": "Apple — Make Something Wonderful", "videoUrl": "https://…/apple.mp4",
         "scores": { "auditory_engagement": 71, "language_message": 64, "attention_salience": 58, "visual_motion": 80 }, "overall": 68 },
  "b": { "label": "Old Spice — Schedule", "videoUrl": "https://…/oldspice.mp4",
         "scores": { "auditory_engagement": 66, "language_message": 59, "attention_salience": 74, "visual_motion": 62 }, "overall": 65 }
}'
# → { "comparePath": "/compare?round=cmp_…" }
```

## The before/after (the Terac "improvement")

- **Before** — an equal-weighted model predicts the overall winner from the four
  family scores. Measure how often it agrees with the human overall vote.
- **After** — fit dimension weights (logistic) on the pooled human votes, then
  predict again. The accuracy lift is the improvement *driven by human input*.
- The fit needs **≥2 matchups with different score profiles** to separate the
  dimensions (`fitReliable` flags this) — so run a few A/Bs.

## Launch a round on Terac (agent runbook)

Same as the one-shot flow (`TERAC.md`), but point the opportunity's `task_url` at
`…/compare?round=<id>` and note the task is "watch two short ads, pick a winner
per question (~1–2 min)". Smoke-test with `num_participants: 3` first, then launch.
Watch results live at `/compare/results?round=<id>`.
