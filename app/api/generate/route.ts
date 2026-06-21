import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 600;

/**
 * Stage 2 gateway. Prompt optimization runs in Next.js, while the Python
 * pipeline owns the authenticated Pika/Seedance generation client and Redis
 * video cache.
 */
export async function POST(request: Request) {
  const pipelineUrl = process.env.CEREBRA_OPTIMIZER_URL;
  if (!pipelineUrl) {
    return NextResponse.json(
      { error: "Video pipeline is not configured. Set CEREBRA_OPTIMIZER_URL." },
      { status: 503 },
    );
  }

  try {
    const body = await request.text();
    const upstream = await fetch(`${pipelineUrl.replace(/\/$/, "")}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: AbortSignal.timeout(590_000),
    });

    return new NextResponse(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Video pipeline is unavailable. Make sure it is running on port 8100." },
      { status: 502 },
    );
  }
}
