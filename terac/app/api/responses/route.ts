import { NextResponse } from "next/server";

export const runtime = "nodejs";
const choice = (value: unknown) => value === "a" || value === "b";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.participant_session_id !== "string" || !Number.isInteger(body.trial_index) || typeof body.video_a !== "string" || typeof body.video_b !== "string" || !choice(body.question_1) || !choice(body.question_2) || !choice(body.question_3) || !choice(body.question_4) || typeof body.question_5 !== "string" || !body.question_5.trim()) return NextResponse.json({ error: "Please complete every question before continuing." }, { status: 400 });
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Study storage is not configured yet." }, { status: 503 });
  // Supabase's dashboard can copy either the project URL or its REST endpoint.
  // Normalize both forms before adding the table path.
  const apiBase = url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  const saved = await fetch(`${apiBase}/rest/v1/video_comparison_responses`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(body) });
  if (!saved.ok) return NextResponse.json({ error: "Unable to save your response." }, { status: 502 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
