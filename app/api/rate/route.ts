import { NextResponse } from "next/server";

import { createRound, patchRound, ratePath, readRatings, readRound, aggregate } from "@/app/lib/terac";

export const runtime = "nodejs";

/** GET /api/rate?round=<id> — round metadata + the live human-rating aggregate. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("round");
  if (!id) return NextResponse.json({ error: "Missing round id" }, { status: 400 });
  const round = await readRound(id);
  if (!round) return NextResponse.json({ error: "Unknown round" }, { status: 404 });
  const ratings = await readRatings(id);
  return NextResponse.json(
    { round, ratePath: ratePath(id), aggregate: aggregate(ratings) },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * POST /api/rate — open a rating round for a generated ad, or flag a round for a
 * Terac recruitment launch. The actual MCP launch is agent-driven (an agent with
 * the Terac MCP connected points an opportunity at /rate?round=<id>); see TERAC.md.
 *
 *   { action: "create", videoUrl, brief?, product?, aspect?, durationSec? }
 *   { action: "launch", round, numParticipants?, durationMinutes? }
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
    if (typeof body.videoUrl !== "string" || !body.videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }
    const round = await createRound({
      videoUrl: body.videoUrl,
      brief: typeof body.brief === "string" ? body.brief : undefined,
      product: typeof body.product === "string" ? body.product : undefined,
      aspect: typeof body.aspect === "string" ? body.aspect : undefined,
      durationSec: typeof body.durationSec === "number" ? body.durationSec : undefined,
    });
    return NextResponse.json({ round, ratePath: ratePath(round.id) });
  }

  if (action === "launch") {
    const id = typeof body.round === "string" ? body.round : "";
    if (!id) return NextResponse.json({ error: "round is required" }, { status: 400 });
    const round = await patchRound(id, {
      terac: {
        requested: true,
        numParticipants: Number(body.numParticipants) || 25,
        durationMinutes: Number(body.durationMinutes) || 5,
        status: "draft",
      },
    });
    if (!round) return NextResponse.json({ error: "Unknown round" }, { status: 404 });
    return NextResponse.json({ round, ratePath: ratePath(id) });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
