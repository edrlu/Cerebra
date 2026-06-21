import { NextResponse } from "next/server";

import { addVote, aggregate, readMatchup, readVotes, type DimKey, type Side } from "@/app/lib/arena";

export const runtime = "nodejs";

/**
 * POST /api/compare/submit — record one participant's pairwise vote.
 *   { round, picks: { overall: "a"|"b", auditory_engagement?: "a"|"b", ... },
 *     reason?, submissionId?, taskId? }
 * `overall` is required; the four family picks are optional but expected.
 * Returns the live aggregate so the page can show running agreement.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const id = typeof body.round === "string" ? body.round : "";
  if (!id) return NextResponse.json({ error: "round is required" }, { status: 400 });

  const matchup = await readMatchup(id);
  if (!matchup) return NextResponse.json({ error: "Unknown matchup" }, { status: 404 });
  if (matchup.status === "closed") return NextResponse.json({ error: "This matchup is closed" }, { status: 409 });

  const rawPicks = (body.picks ?? {}) as Record<string, unknown>;
  const picks: Partial<Record<DimKey, Side>> = {};
  for (const [k, v] of Object.entries(rawPicks)) {
    if (v === "a" || v === "b") picks[k as DimKey] = v as Side;
  }

  try {
    await addVote(id, {
      picks,
      reason: typeof body.reason === "string" ? body.reason : undefined,
      submissionId: typeof body.submissionId === "string" ? body.submissionId : undefined,
      taskId: typeof body.taskId === "string" ? body.taskId : undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not record vote" }, { status: 400 });
  }

  const votes = await readVotes(id);
  return NextResponse.json({ ok: true, aggregate: aggregate(matchup, votes) });
}
