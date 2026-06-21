import { NextResponse } from "next/server";

import {
  aggregate,
  comparePath,
  createMatchup,
  patchMatchup,
  pooledEval,
  readMatchup,
  readVotes,
  type Clip,
} from "@/app/lib/arena";

export const runtime = "nodejs";

/**
 * GET /api/compare?round=<id> — matchup + the live per-dimension model-vs-human
 *                               aggregate (the before/after-per-question view).
 * GET /api/compare?eval=1     — pooled before/after eval across ALL matchups
 *                               (equal-weighted vs human-calibrated agreement).
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  if (sp.has("eval")) {
    return NextResponse.json(await pooledEval(), { headers: { "cache-control": "no-store" } });
  }
  const id = sp.get("round");
  if (!id) return NextResponse.json({ error: "Missing round id" }, { status: 400 });
  const matchup = await readMatchup(id);
  if (!matchup) return NextResponse.json({ error: "Unknown matchup" }, { status: 404 });
  const votes = await readVotes(id);
  return NextResponse.json(
    { matchup, comparePath: comparePath(id), aggregate: aggregate(matchup, votes) },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * POST /api/compare
 *   { action: "create", a: Clip, b: Clip, brief? }   — open a pairwise matchup
 *   { action: "launch", round, numParticipants?, durationMinutes? } — flag for Terac
 *
 * Clip = { label?, videoUrl, scores: {auditory_engagement, language_message,
 *          attention_salience, visual_motion}, overall? }. Scores come from the
 * worker /predict (regions + engagementScore); overall defaults to their mean.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  const action = body.action;

  if (action === "create") {
    try {
      const matchup = await createMatchup({
        a: body.a as Partial<Clip>,
        b: body.b as Partial<Clip>,
        brief: typeof body.brief === "string" ? body.brief : undefined,
      });
      return NextResponse.json({ matchup, comparePath: comparePath(matchup.id) });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Could not create matchup" }, { status: 400 });
    }
  }

  if (action === "launch") {
    const id = typeof body.round === "string" ? body.round : "";
    if (!id) return NextResponse.json({ error: "round is required" }, { status: 400 });
    const matchup = await patchMatchup(id, {
      terac: {
        requested: true,
        numParticipants: Number(body.numParticipants) || 25,
        durationMinutes: Number(body.durationMinutes) || 3,
        status: "draft",
      },
    });
    if (!matchup) return NextResponse.json({ error: "Unknown matchup" }, { status: 404 });
    return NextResponse.json({ matchup, comparePath: comparePath(id) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
