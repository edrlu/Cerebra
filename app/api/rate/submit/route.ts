import { NextResponse } from "next/server";

import { addRating, aggregate, readRatings, readRound } from "@/app/lib/terac";

export const runtime = "nodejs";

/**
 * POST /api/rate/submit — record one human rating for a round. Accepts JSON or
 * form-encoded bodies so it works straight from the /rate page and from a
 * Terac-hosted task frame.
 *
 *   { round | roundId, stars (1..5), reason?, submissionId?, taskId? }
 */
export async function POST(request: Request) {
  const data: Record<string, string> = {};
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(json)) data[k] = v == null ? "" : String(v);
    } else {
      const form = await request.formData();
      form.forEach((v, k) => {
        data[k] = typeof v === "string" ? v : "";
      });
    }
  } catch {
    return NextResponse.json({ error: "Bad request body" }, { status: 400 });
  }

  const id = data.round || data.roundId || "";
  if (!id) return NextResponse.json({ error: "round is required" }, { status: 400 });
  const round = await readRound(id);
  if (!round) return NextResponse.json({ error: "Unknown round" }, { status: 404 });
  if (round.status === "closed") return NextResponse.json({ error: "This round is closed" }, { status: 409 });

  const stars = Math.round(Number(data.stars));
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "stars must be an integer 1..5" }, { status: 422 });
  }

  try {
    await addRating(id, {
      stars,
      reason: data.reason || undefined,
      submissionId: data.submissionId || undefined,
      taskId: data.taskId || undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not record the rating";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, aggregate: aggregate(await readRatings(id)) });
}
