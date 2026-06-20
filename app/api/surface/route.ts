import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const workerUrl = process.env.TRIBEV2_API_URL;
  if (!workerUrl) {
    return NextResponse.json({ error: "No TRIBE v2 worker configured." }, { status: 503 });
  }
  try {
    const upstream = await fetch(`${workerUrl.replace(/\/$/, "")}/surface`, {
      signal: AbortSignal.timeout(120_000),
    });
    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Surface mesh unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
