"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

// Public, single-ad rating task. This is the URL a Terac opportunity points its
// participants at: /rate?round=<id>. Terac appends its own identifiers
// (?submissionId=…&taskId=…); we capture them so each 1–5 score is attributable.
// The aggregate score flows back to the Studio UI via /api/rate.

type Round = { id: string; videoUrl: string; brief?: string; product?: string; durationSec?: number; status: string };

function readParams() {
  if (typeof window === "undefined") return { round: "", submissionId: "", taskId: "" };
  const p = new URLSearchParams(window.location.search);
  return {
    round: p.get("round") || "",
    submissionId: p.get("submissionId") || p.get("submission_id") || "",
    taskId: p.get("taskId") || p.get("task_id") || "",
  };
}

export default function RatePage() {
  const params = useRef({ round: "", submissionId: "", taskId: "" });
  const [round, setRound] = useState<Round | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = readParams();
    params.current = next;
    let alive = true;
    // A missing round id falls through to the API's 400 (handled in .catch), so
    // the effect body itself never calls setState synchronously.
    fetch(`/api/rate?round=${encodeURIComponent(next.round)}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Could not load this ad.");
        if (alive) setRound(data.round as Round);
      })
      .catch((e) => {
        if (alive) setLoadError(e instanceof Error ? e.message : "Could not load this ad.");
      });
    return () => { alive = false; };
  }, []);

  const value = hover || stars;

  async function submit() {
    if (!round || stars < 1) {
      setError("Pick a score from 1 to 5 first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/rate/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          round: round.id,
          stars,
          reason: reason.trim() || undefined,
          submissionId: params.current.submissionId || undefined,
          taskId: params.current.taskId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit your rating.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your rating.");
    } finally {
      setSubmitting(false);
    }
  }

  const labels = useMemo(() => ["", "Skip it", "Meh", "It's fine", "I like it", "Love it"], []);

  return (
    <main style={S.shell}>
      <div style={S.card}>
        <div style={S.brand}>
          <span style={S.dot} /> CEREBRA · AD RATING
        </div>

        {loadError ? (
          <p style={S.muted}>{loadError}</p>
        ) : !round ? (
          <p style={S.muted}>Loading the ad…</p>
        ) : done ? (
          <div style={S.thanks}>
            <div style={S.check}>✓</div>
            <h1 style={S.h1}>Thanks — your rating is in.</h1>
            <p style={S.muted}>
              You can close this tab and return to Terac to finish the task.
            </p>
          </div>
        ) : (
          <>
            <h1 style={S.h1}>How good is this ad?</h1>
            <p style={S.muted}>Watch the short ad, then give it a gut-feel score from 1 to 5.</p>

            <div style={S.videoWrap}>
              <video src={round.videoUrl} controls autoPlay playsInline loop style={S.video} />
            </div>

            <div style={S.stars} role="radiogroup" aria-label="Rating from 1 to 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={stars === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setStars(n)}
                  style={{ ...S.star, color: n <= value ? "#ffce47" : "#3a3f4b" }}
                >
                  ★
                </button>
              ))}
            </div>
            <div style={S.scaleLabel}>{value ? labels[value] : " "}</div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional: one line on why (the hook, the pacing, the payoff…)."
              rows={2}
              style={S.textarea}
            />

            {error && <div style={S.err}>{error}</div>}

            <button type="button" onClick={submit} disabled={submitting || stars < 1} style={{ ...S.submit, opacity: submitting || stars < 1 ? 0.55 : 1 }}>
              {submitting ? "Submitting…" : "Submit rating"}
            </button>
            <p style={S.fine}>Anonymous · one score per participant · powered by Terac.</p>
          </>
        )}
      </div>
    </main>
  );
}

const S: Record<string, CSSProperties> = {
  shell: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0d12", color: "#e9edf5", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: 20 },
  card: { width: "min(560px, 100%)", background: "#12151c", border: "1px solid #232936", borderRadius: 18, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,.45)" },
  brand: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: ".14em", color: "#9aa3b2", fontWeight: 700, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#3fd6c0", display: "inline-block" },
  h1: { fontSize: 22, margin: "0 0 6px", fontWeight: 650 },
  muted: { color: "#9aa3b2", fontSize: 14, margin: "0 0 16px", lineHeight: 1.5 },
  videoWrap: { borderRadius: 14, overflow: "hidden", background: "#000", aspectRatio: "9 / 16", maxHeight: 380, margin: "8px auto 18px", display: "grid", placeItems: "center" },
  video: { width: "100%", height: "100%", objectFit: "contain" },
  stars: { display: "flex", justifyContent: "center", gap: 6 },
  star: { background: "none", border: "none", cursor: "pointer", fontSize: 40, lineHeight: 1, padding: "2px 4px", transition: "color .12s, transform .12s" },
  scaleLabel: { textAlign: "center", height: 20, color: "#cdd4e0", fontSize: 13, marginBottom: 12, fontWeight: 600 },
  textarea: { width: "100%", boxSizing: "border-box", background: "#0c0f15", color: "#e9edf5", border: "1px solid #283041", borderRadius: 12, padding: "10px 12px", fontSize: 14, resize: "vertical", fontFamily: "inherit" },
  submit: { width: "100%", marginTop: 14, padding: "13px 16px", borderRadius: 12, border: "none", background: "#3fd6c0", color: "#06231f", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  err: { marginTop: 12, color: "#ff7a93", fontSize: 13 },
  fine: { textAlign: "center", color: "#6b7383", fontSize: 11, marginTop: 12, marginBottom: 0 },
  thanks: { textAlign: "center", padding: "12px 0 4px" },
  check: { width: 54, height: 54, borderRadius: "50%", background: "rgba(63,214,192,.14)", color: "#3fd6c0", display: "grid", placeItems: "center", fontSize: 26, margin: "0 auto 14px" },
};
