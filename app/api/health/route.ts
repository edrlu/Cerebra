import { NextResponse } from "next/server";

import { studioHealth } from "@/app/lib/studioOptimizer";

export const runtime = "nodejs";

/**
 * Studio readiness probe. The optimizer can run in-process, while the optional
 * Python pipeline exposes the live Redis/Pika/Whisper integration status.
 */
export async function GET() {
  const health = studioHealth();
  const pipelineUrl = process.env.CEREBRA_OPTIMIZER_URL;

  if (pipelineUrl) {
    try {
      const upstream = await fetch(`${pipelineUrl.replace(/\/$/, "")}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (upstream.ok) {
        const pipeline = await upstream.json();
        return NextResponse.json(
          {
            ...health,
            pipeline: {
              connected: true,
              endpoint: pipelineUrl,
              whisper: Boolean(pipeline.whisper),
              pika_connected: Boolean(pipeline.pika_connected),
            },
            redis: pipeline.redis ?? health.redis,
          },
          { headers: { "cache-control": "no-store" } },
        );
      }
    } catch {
      // Keep the built-in optimizer usable when the optional pipeline is down.
    }
  }

  return NextResponse.json({
    ...health,
    pipeline: {
      connected: false,
      endpoint: pipelineUrl ?? null,
      whisper: Boolean(process.env.OPENAI_API_KEY),
      pika_connected: false,
    },
  }, {
    headers: { "cache-control": "no-store" },
  });
}
