// Server-side store for PAIRWISE A/B comparisons of two ads, voted per
// engagement dimension. This is the comparative sibling of the one-shot /rate
// flow (app/lib/terac.ts): instead of "score this one ad 1–5", a Terac
// participant is shown TWO ads and asked, for each dimension, *which one* —
// "which caught your ear?", "which made more sense?", etc.
//
// TRIBE gives each clip a per-family score, so the MODEL also has a predicted
// pick for every question. Pooling human votes across matchups lets us fit
// dimension weights and show a before/after: how often an EQUAL-weighted model
// agrees with humans vs. a model whose dimension weights were learned from the
// human votes. That before/after is the Terac "improvement driven by human
// input".
//
// Storage mirrors the regen / rate pipelines — local-FS scratch under compare/:
//   compare/<id>/matchup.json   the two clips + model picks + Terac launch state
//   compare/<id>/votes.jsonl    one JSON vote per line (append-only)

import { appendFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { TeracLaunch } from "@/app/lib/terac";

export const COMPARE_ROOT = path.join(process.cwd(), "compare");

// TRIBE v2's four engagement families (must match worker/app.py ENGAGEMENT_FAMILIES keys).
export const FAMILY_KEYS = [
  "auditory_engagement",
  "language_message",
  "attention_salience",
  "visual_motion",
] as const;
export type FamilyKey = (typeof FAMILY_KEYS)[number];

export type DimKey = "overall" | FamilyKey;
export type Side = "a" | "b";
export type Pick = Side | "tie";

// The pairwise vote labels — the exact "which one…?" questions. `overall` is the
// headline; the four families decompose it. Colors match the worker families.
export const DIMENSIONS: { key: DimKey; short: string; question: string; color: string }[] = [
  { key: "overall", short: "Overall", question: "Which one are you more into — which would you keep watching?", color: "#ffce47" },
  { key: "auditory_engagement", short: "AUD", question: "Which one caught your ear more?", color: "#ffb13b" },
  { key: "language_message", short: "LANG", question: "Which one made more sense / landed its message better?", color: "#ff5a7a" },
  { key: "attention_salience", short: "ATTN", question: "Which one held your attention?", color: "#9b8cff" },
  { key: "visual_motion", short: "VIS", question: "Which one were you watching more closely?", color: "#3fd6c0" },
];

export type Clip = {
  label: string;
  videoUrl: string;
  scores: Record<FamilyKey, number>; // TRIBE per-family score, 0..100
  overall: number; // TRIBE overall engagement, 0..100 (equal-weighted mean)
};

export type Matchup = {
  id: string;
  createdAt: string;
  a: Clip;
  b: Clip;
  brief?: string;
  status: "open" | "closed";
  // The model's predicted pick for every question, from the clips' TRIBE scores.
  modelPicks: Record<DimKey, Pick>;
  terac?: TeracLaunch;
};

export type Vote = {
  picks: Partial<Record<DimKey, Side>>; // a voter's chosen side per question
  reason?: string;
  submissionId?: string; // Terac submission id
  taskId?: string; // Terac task id
  at: string; // ISO timestamp
};

// Forced choice — the model always commits to a side (no tie). Exact score
// equality is effectively impossible with floats; it breaks toward "a".
function pickFrom(av: number, bv: number): Side {
  return av >= bv ? "a" : "b";
}

export function modelPicksFor(a: Clip, b: Clip): Record<DimKey, Pick> {
  const picks = { overall: pickFrom(a.overall, b.overall) } as Record<DimKey, Pick>;
  for (const k of FAMILY_KEYS) picks[k] = pickFrom(a.scores[k], b.scores[k]);
  return picks;
}

function matchupDir(id: string) {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) throw new Error("Invalid matchup id");
  return path.join(COMPARE_ROOT, safe);
}

export function comparePath(id: string) {
  return `/compare?round=${encodeURIComponent(id)}`;
}

function normClip(raw: Partial<Clip> | undefined, fallbackLabel: string): Clip {
  if (!raw || typeof raw.videoUrl !== "string" || !raw.videoUrl) {
    throw new Error(`Clip ${fallbackLabel}: videoUrl is required`);
  }
  const scores = {} as Record<FamilyKey, number>;
  for (const k of FAMILY_KEYS) {
    const v = Number((raw.scores as Record<string, unknown> | undefined)?.[k]);
    scores[k] = Number.isFinite(v) ? v : 0;
  }
  const overall = Number(raw.overall);
  return {
    label: typeof raw.label === "string" && raw.label ? raw.label : fallbackLabel,
    videoUrl: raw.videoUrl,
    scores,
    overall: Number.isFinite(overall)
      ? overall
      : Number((Object.values(scores).reduce((s, c) => s + c, 0) / FAMILY_KEYS.length).toFixed(1)),
  };
}

export async function createMatchup(input: { a: Partial<Clip>; b: Partial<Clip>; brief?: string }): Promise<Matchup> {
  const a = normClip(input.a, "A");
  const b = normClip(input.b, "B");
  const id = `cmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const matchup: Matchup = {
    id,
    createdAt: new Date().toISOString(),
    a,
    b,
    brief: input.brief,
    status: "open",
    modelPicks: modelPicksFor(a, b),
  };
  await mkdir(matchupDir(id), { recursive: true });
  await writeFile(path.join(matchupDir(id), "matchup.json"), JSON.stringify(matchup, null, 2));
  return matchup;
}

export async function readMatchup(id: string): Promise<Matchup | null> {
  try {
    return JSON.parse(await readFile(path.join(matchupDir(id), "matchup.json"), "utf8")) as Matchup;
  } catch {
    return null;
  }
}

export async function patchMatchup(id: string, patch: Partial<Matchup>): Promise<Matchup | null> {
  const cur = await readMatchup(id);
  if (!cur) return null;
  const next: Matchup = {
    ...cur,
    ...patch,
    terac: patch.terac ? { ...cur.terac, ...patch.terac } : cur.terac,
  };
  await writeFile(path.join(matchupDir(id), "matchup.json"), JSON.stringify(next, null, 2));
  return next;
}

export async function addVote(id: string, vote: Omit<Vote, "at">): Promise<void> {
  const picks: Partial<Record<DimKey, Side>> = {};
  for (const d of DIMENSIONS) {
    const p = (vote.picks as Record<string, unknown>)?.[d.key];
    if (p === "a" || p === "b") picks[d.key] = p;
  }
  if (picks.overall === undefined) throw new Error("An overall pick (a|b) is required");
  const rec: Vote = {
    picks,
    reason: vote.reason ? String(vote.reason).slice(0, 500) : undefined,
    submissionId: vote.submissionId || undefined,
    taskId: vote.taskId || undefined,
    at: new Date().toISOString(),
  };
  await mkdir(matchupDir(id), { recursive: true });
  await appendFile(path.join(matchupDir(id), "votes.jsonl"), JSON.stringify(rec) + "\n");
}

export async function readVotes(id: string): Promise<Vote[]> {
  try {
    const raw = await readFile(path.join(matchupDir(id), "votes.jsonl"), "utf8");
    return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line) as Vote);
  } catch {
    return [];
  }
}

export async function listMatchups(): Promise<Matchup[]> {
  let ids: string[];
  try {
    ids = await readdir(COMPARE_ROOT);
  } catch {
    return [];
  }
  const out: Matchup[] = [];
  for (const id of ids) {
    const m = await readMatchup(id);
    if (m) out.push(m);
  }
  return out;
}

// --- Per-matchup aggregate: model pick vs human pick, per dimension ----------

export type DimAggregate = {
  key: DimKey;
  short: string;
  question: string;
  color: string;
  a: number; // votes for clip A
  b: number; // votes for clip B
  n: number;
  humanPick: Pick;
  humanMarginPct: number; // |a-b|/n as a percentage
  modelPick: Pick;
  agree: boolean | null; // model vs human majority (null if no votes / human tie)
};

export type MatchupAggregate = {
  totalVotes: number;
  dims: DimAggregate[];
  overallAgree: boolean | null;
  agreementPct: number; // % of dimensions where model and human agree (among decided)
};

export function aggregate(m: Matchup, votes: Vote[]): MatchupAggregate {
  const dims: DimAggregate[] = DIMENSIONS.map((d) => {
    let a = 0;
    let b = 0;
    for (const v of votes) {
      const p = v.picks[d.key];
      if (p === "a") a++;
      else if (p === "b") b++;
    }
    const n = a + b;
    const humanPick: Pick = n === 0 ? "tie" : a > b ? "a" : b > a ? "b" : "tie";
    const modelPick = m.modelPicks[d.key];
    const agree = n === 0 || humanPick === "tie" ? null : modelPick === humanPick;
    return {
      key: d.key,
      short: d.short,
      question: d.question,
      color: d.color,
      a,
      b,
      n,
      humanPick,
      humanMarginPct: n ? Math.round((Math.abs(a - b) / n) * 100) : 0,
      modelPick,
      agree,
    };
  });
  const decided = dims.filter((d) => d.agree !== null);
  const agreed = decided.filter((d) => d.agree).length;
  return {
    totalVotes: votes.length,
    dims,
    overallAgree: dims.find((d) => d.key === "overall")?.agree ?? null,
    agreementPct: decided.length ? Math.round((agreed / decided.length) * 100) : 0,
  };
}

// --- Pooled before/after eval: learn dimension weights from human votes ------

export type PooledEval = {
  n: number; // overall votes used
  nMatchups: number;
  beforeAcc: number; // equal-weighted model agreement with human OVERALL pick (0..1)
  afterAcc: number; // human-calibrated model agreement (0..1)
  weights: Record<FamilyKey, number>; // learned logistic weights (signed)
  weightsNorm: Record<FamilyKey, number>; // |w| normalized to sum 1 (relative importance)
  fitReliable: boolean; // needs >= 2 matchups with differing score profiles
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const dot = (w: number[], x: number[]) => w.reduce((s, c, i) => s + c * x[i], 0);

/**
 * Pool every overall vote across all matchups into (Δfamily-scores -> chose A?)
 * pairs, then:
 *  - BEFORE: equal-weighted rule (predict A when the mean family-score diff > 0),
 *  - AFTER:  logistic weights fit on the four family-score diffs.
 * Reports both accuracies and the learned weights. With a single matchup all Δ
 * are identical, so the fit can't separate dimensions — `fitReliable` flags that.
 */
export async function pooledEval(): Promise<PooledEval> {
  const matchups = await listMatchups();
  const X: number[][] = [];
  const Y: number[] = [];
  const distinct = new Set<string>();
  for (const m of matchups) {
    const votes = await readVotes(m.id);
    const x = FAMILY_KEYS.map((k) => (m.a.scores[k] - m.b.scores[k]) / 100);
    let used = false;
    for (const v of votes) {
      const ov = v.picks.overall;
      if (ov !== "a" && ov !== "b") continue;
      X.push(x);
      Y.push(ov === "a" ? 1 : 0);
      used = true;
    }
    if (used) distinct.add(x.map((c) => c.toFixed(3)).join(","));
  }
  const n = X.length;
  const zero = Object.fromEntries(FAMILY_KEYS.map((k) => [k, 0])) as Record<FamilyKey, number>;
  if (!n) {
    return { n: 0, nMatchups: matchups.length, beforeAcc: 0, afterAcc: 0, weights: zero, weightsNorm: zero, fitReliable: false };
  }

  const acc = (predict: (x: number[]) => number) =>
    X.reduce((s, x, i) => s + (predict(x) === Y[i] ? 1 : 0), 0) / n;

  const beforeAcc = acc((x) => (x.reduce((s, c) => s + c, 0) >= 0 ? 1 : 0));

  // Fit logistic regression (4 weights + bias) by gradient descent.
  const w = [0, 0, 0, 0];
  let bias = 0;
  const lr = 0.3;
  const l2 = 1e-3;
  for (let it = 0; it < 1000; it++) {
    const gw = [0, 0, 0, 0];
    let gb = 0;
    for (let i = 0; i < n; i++) {
      const e = sigmoid(bias + dot(w, X[i])) - Y[i];
      for (let j = 0; j < 4; j++) gw[j] += e * X[i][j];
      gb += e;
    }
    for (let j = 0; j < 4; j++) w[j] -= lr * (gw[j] / n + l2 * w[j]);
    bias -= lr * (gb / n);
  }
  const afterAcc = acc((x) => (sigmoid(bias + dot(w, x)) >= 0.5 ? 1 : 0));

  const mag = w.map(Math.abs);
  const magSum = mag.reduce((s, c) => s + c, 0) || 1;
  const weights = Object.fromEntries(FAMILY_KEYS.map((k, j) => [k, Number(w[j].toFixed(4))])) as Record<FamilyKey, number>;
  const weightsNorm = Object.fromEntries(FAMILY_KEYS.map((k, j) => [k, Number((mag[j] / magSum).toFixed(4))])) as Record<FamilyKey, number>;
  return {
    n,
    nMatchups: matchups.length,
    beforeAcc: Number(beforeAcc.toFixed(3)),
    afterAcc: Number(afterAcc.toFixed(3)),
    weights,
    weightsNorm,
    fitReliable: distinct.size >= 2,
  };
}
