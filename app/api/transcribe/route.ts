import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Voice → text gateway. The Python pipeline prefers OpenAI Whisper and falls
 * back to local faster-whisper when the API project is out of quota.
 */
export async function POST(request: Request) {
  const pipelineUrl = process.env.CEREBRA_OPTIMIZER_URL;
  if (!pipelineUrl) {
    return NextResponse.json(
      { error: "Voice transcription pipeline is not configured." },
      { status: 503 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "application/octet-stream";
    const body = Buffer.from(await request.arrayBuffer());
    const upstream = await fetch(`${pipelineUrl.replace(/\/$/, "")}/transcribe`, {
      method: "POST",
      headers: { "content-type": contentType },
      body,
      signal: AbortSignal.timeout(295_000),
    });
    const responseBody = await upstream.arrayBuffer();
    if (!upstream.ok) {
      let message = `Whisper transcription failed (${upstream.status}).`;
      try {
        const parsed = JSON.parse(new TextDecoder().decode(responseBody)) as {
          error?: string | { message?: string };
          detail?: string | { message?: string };
        };
        const detail = parsed.error ?? parsed.detail;
        if (typeof detail === "string") message = detail;
        else if (detail?.message) message = detail.message;
      } catch {
        // Keep the status-based fallback.
      }
      return NextResponse.json({ error: message }, {
        status: upstream.status,
        headers: { "cache-control": "no-store" },
      });
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Voice transcription pipeline is unavailable. Make sure it is running on port 8100." },
      { status: 502 },
    );
  }
}
