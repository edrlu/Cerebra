import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Streams a rendered video from the Python pipeline's Redis cache. Range
 * requests are forwarded so the browser video player can seek normally.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const pipelineUrl = process.env.CEREBRA_OPTIMIZER_URL;
  if (!pipelineUrl) {
    return NextResponse.json(
      { error: "Video pipeline is not configured. Set CEREBRA_OPTIMIZER_URL." },
      { status: 503 },
    );
  }

  try {
    const range = request.headers.get("range");
    const upstream = await fetch(
      `${pipelineUrl.replace(/\/$/, "")}/video/${encodeURIComponent(id)}`,
      { headers: range ? { range } : {} },
    );
    const headers = new Headers();
    for (const name of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
    ]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Video pipeline is unavailable. Make sure it is running on port 8100." },
      { status: 502 },
    );
  }
}
