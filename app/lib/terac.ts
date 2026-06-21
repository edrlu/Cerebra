// Server-side store for one-shot Terac human ratings of a generated ad.
//
// Cerebra generates a short-form ad (Studio → Pika/Seedance). To put a real
// human number on that ad we open a "rating round" for it and recruit raters
// through the Terac MCP — terac_get_context → terac_create_project →
// terac_create_opportunity → terac_launch_draft_opportunity, with the task URL
// pointed at /rate?round=<id> (see TERAC.md for the agent runbook). Each rater
// opens /rate, watches the ad, and leaves a 1–5 score; those land here. The
// aggregate human score is shown in the Studio UI and can be fed back into the
// optimizer to refine the next rewrite.
//
// Storage is local-FS scratch under rate/<id>/ (mirrors the regen pipeline):
//   rate/<id>/round.json     round metadata + Terac launch state
//   rate/<id>/ratings.jsonl  one JSON rating per line (append-only)

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const RATE_ROOT = path.join(process.cwd(), "rate");

export type Rating = {
  stars: number; // 1..5
  reason?: string;
  submissionId?: string; // Terac submission id (when the rater arrived via Terac)
  taskId?: string; // Terac task id
  at: string; // ISO timestamp
};

// Terac launch state for a round. The actual MCP calls are made by an agent
// (Codex/Claude) connected to the Terac MCP — the app only records intent and
// whatever the agent writes back. See TERAC.md.
export type TeracLaunch = {
  requested: boolean; // a human asked to recruit raters via Terac
  numParticipants?: number;
  durationMinutes?: number;
  projectId?: string; // filled in by the agent driving the Terac MCP
  opportunityId?: string;
  status?: "draft" | "launched" | "closed";
  quote?: string; // price quote returned by terac_create_opportunity
  note?: string;
};

export type Round = {
  id: string;
  createdAt: string;
  videoUrl: string;
  brief?: string;
  product?: string;
  aspect?: string;
  durationSec?: number;
  status: "open" | "closed";
  terac?: TeracLaunch;
};

export type RoundAggregate = {
  n: number;
  meanStars: number; // 0..5
  score100: number; // 0..100 (meanStars / 5 * 100)
  distribution: number[]; // counts for 1..5 stars; index 0 = 1 star
  reasons: string[]; // most recent non-empty reasons
};

function roundDir(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) throw new Error("Invalid round id");
  return path.join(RATE_ROOT, safe);
}

export function ratePath(id: string) {
  return `/rate?round=${encodeURIComponent(id)}`;
}

export async function createRound(input: {
  videoUrl: string;
  brief?: string;
  product?: string;
  aspect?: string;
  durationSec?: number;
}): Promise<Round> {
  const id = `round_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const round: Round = {
    id,
    createdAt: new Date().toISOString(),
    videoUrl: input.videoUrl,
    brief: input.brief,
    product: input.product,
    aspect: input.aspect,
    durationSec: input.durationSec,
    status: "open",
  };
  await mkdir(roundDir(id), { recursive: true });
  await writeFile(path.join(roundDir(id), "round.json"), JSON.stringify(round, null, 2));
  return round;
}

export async function readRound(id: string): Promise<Round | null> {
  try {
    return JSON.parse(await readFile(path.join(roundDir(id), "round.json"), "utf8")) as Round;
  } catch {
    return null;
  }
}

export async function patchRound(id: string, patch: Partial<Round>): Promise<Round | null> {
  const cur = await readRound(id);
  if (!cur) return null;
  const next: Round = {
    ...cur,
    ...patch,
    terac: patch.terac ? { ...cur.terac, ...patch.terac } : cur.terac,
  };
  await writeFile(path.join(roundDir(id), "round.json"), JSON.stringify(next, null, 2));
  return next;
}

export async function addRating(id: string, rating: Omit<Rating, "at">): Promise<void> {
  const stars = Math.round(Number(rating.stars));
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) throw new Error("stars must be an integer 1..5");
  const rec: Rating = {
    stars,
    reason: rating.reason ? String(rating.reason).slice(0, 500) : undefined,
    submissionId: rating.submissionId || undefined,
    taskId: rating.taskId || undefined,
    at: new Date().toISOString(),
  };
  await mkdir(roundDir(id), { recursive: true });
  await appendFile(path.join(roundDir(id), "ratings.jsonl"), JSON.stringify(rec) + "\n");
}

export async function readRatings(id: string): Promise<Rating[]> {
  try {
    const raw = await readFile(path.join(roundDir(id), "ratings.jsonl"), "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Rating);
  } catch {
    return [];
  }
}

export function aggregate(ratings: Rating[]): RoundAggregate {
  const distribution = [0, 0, 0, 0, 0];
  let sum = 0;
  const reasons: string[] = [];
  for (const r of ratings) {
    if (r.stars >= 1 && r.stars <= 5) {
      distribution[r.stars - 1] += 1;
      sum += r.stars;
    }
    if (r.reason) reasons.push(r.reason);
  }
  const n = ratings.length;
  const meanStars = n ? sum / n : 0;
  return {
    n,
    meanStars: Number(meanStars.toFixed(2)),
    score100: Math.round((meanStars / 5) * 100),
    distribution,
    reasons: reasons.slice(-12),
  };
}
