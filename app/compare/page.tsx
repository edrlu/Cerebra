"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Public, pairwise A/B rating task — the URL a Terac opportunity points its
// participants at: /compare?round=<id>. Terac appends ?submissionId=…&taskId=…,
// which we capture so each vote is attributable. The participant watches BOTH
// ads, then answers each "which one…?" question; votes flow to /api/compare.

type Side = "a" | "b";
type Dim = { key: string; short: string; question: string; color: string };
type Clip = { label: string; videoUrl: string };
type Matchup = { id: string; a: Clip; b: Clip; brief?: string; status: string };

function readParams() {
  if (typeof window === "undefined") return { round: "", submissionId: "", taskId: "" };
  const p = new URLSearchParams(window.location.search);
  return {
    round: p.get("round") || "",
    submissionId: p.get("submissionId") || p.get("submission_id") || "",
    taskId: p.get("taskId") || p.get("task_id") || "",
  };
}

export default function ComparePage() {
  const params = useRef({ round: "", submissionId: "", taskId: "" });
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [dims, setDims] = useState<Dim[]>([]);
  const [picks, setPicks] = useState<Record<string, Side>>({});
  const [reason, setReason] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const next = readParams();
    params.current = next;
    let alive = true;
    fetch(`/api/compare?round=${encodeURIComponent(next.round)}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Could not load this comparison.");
        if (!alive) return;
        setMatchup(data.matchup as Matchup);
        setDims((data.aggregate?.dims ?? []) as Dim[]);
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : "Could not load this comparison."));
    return () => { alive = false; };
  }, []);

  function choose(key: string, side: Side) {
    setPicks((p) => ({ ...p, [key]: side }));
  }

  async function submit() {
    if (!matchup || !picks.overall) {
      setError("Answer at least the first question (which one overall).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/compare/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          round: matchup.id,
          picks,
          reason: reason.trim() || undefined,
          submissionId: params.current.submissionId || undefined,
          taskId: params.current.taskId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not submit your vote.");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your vote.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={S.shell}>
      <div style={S.card}>
        <div style={S.brand}><span style={S.dot} /> CEREBRA · WHICH AD WINS?</div>

        {loadError ? (
          <p style={S.muted}>{loadError}</p>
        ) : !matchup ? (
          <p style={S.muted}>Loading the two ads…</p>
        ) : done ? (
          <div style={S.thanks}>
            <div style={S.check}>✓</div>
            <h1 style={S.h1}>Thanks — your votes are in.</h1>
            <p style={S.muted}>You can close this tab and return to Terac to finish the task.</p>
          </div>
        ) : (
          <>
            <h1 style={S.h1}>Watch both, then pick a winner for each question.</h1>
            <p style={S.muted}>No wrong answers — go with your gut.</p>

            <div style={S.videos}>
              {(["a", "b"] as const).map((side) => (
                <div key={side} style={S.videoCol}>
                  <div style={{ ...S.tag, background: side === "a" ? "#3fd6c0" : "#ffb13b", color: "#06231f" }}>
                    {side.toUpperCase()} · {matchup[side].label}
                  </div>
                  <div style={S.videoWrap}>
                    <video src={matchup[side].videoUrl} controls playsInline loop style={S.video} />
                  </div>
                </div>
              ))}
            </div>

            <div style={S.questions}>
              {dims.map((d) => (
                <div key={d.key} style={{ ...S.qRow, ...(d.key === "overall" ? S.qRowHero : {}) }}>
                  <div style={S.qText}>
                    {d.key !== "overall" && <span style={{ ...S.qChip, color: d.color, borderColor: d.color }}>{d.short}</span>}
                    {d.question}
                  </div>
                  <div style={S.qBtns}>
                    {(["a", "b"] as const).map((side) => {
                      const active = picks[d.key] === side;
                      const accent = side === "a" ? "#3fd6c0" : "#ffb13b";
                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => choose(d.key, side)}
                          aria-pressed={active}
                          style={{
                            ...S.pickBtn,
                            borderColor: active ? accent : "#2b3344",
                            background: active ? accent : "transparent",
                            color: active ? "#06231f" : "#cdd4e0",
                          }}
                        >
                          {side.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional: one line on what tipped it for you."
              rows={2}
              style={S.textarea}
            />

            {error && <div style={S.err}>{error}</div>}

            <button type="button" onClick={submit} disabled={submitting || !picks.overall} style={{ ...S.submit, opacity: submitting || !picks.overall ? 0.55 : 1 }}>
              {submitting ? "Submitting…" : "Submit votes"}
            </button>
            <p style={S.fine}>Anonymous · one set of votes per participant · powered by Terac.</p>
          </>
        )}
      </div>
    </main>
  );
}

const S: Record<string, CSSProperties> = {
  shell: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0d12", color: "#e9edf5", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: 20 },
  card: { width: "min(720px, 100%)", background: "#12151c", border: "1px solid #232936", borderRadius: 18, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,.45)" },
  brand: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: ".14em", color: "#9aa3b2", fontWeight: 700, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#3fd6c0", display: "inline-block" },
  h1: { fontSize: 22, margin: "0 0 6px", fontWeight: 650 },
  muted: { color: "#9aa3b2", fontSize: 14, margin: "0 0 16px", lineHeight: 1.5 },
  videos: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "6px 0 18px" },
  videoCol: { display: "flex", flexDirection: "column", gap: 8 },
  tag: { alignSelf: "flex-start", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", padding: "3px 8px", borderRadius: 999 },
  videoWrap: { borderRadius: 12, overflow: "hidden", background: "#000", aspectRatio: "16 / 9", display: "grid", placeItems: "center" },
  video: { width: "100%", height: "100%", objectFit: "contain" },
  questions: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 },
  qRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 12, background: "#0c0f15", border: "1px solid #1d2330" },
  qRowHero: { background: "#131820", border: "1px solid #2b3344" },
  qText: { fontSize: 14, color: "#e3e8f1", lineHeight: 1.35 },
  qChip: { fontSize: 10, fontWeight: 800, letterSpacing: ".06em", border: "1px solid", borderRadius: 6, padding: "1px 5px", marginRight: 8 },
  qBtns: { display: "flex", gap: 6, flexShrink: 0 },
  pickBtn: { width: 44, height: 38, borderRadius: 10, border: "1.5px solid", fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all .12s" },
  textarea: { width: "100%", boxSizing: "border-box", background: "#0c0f15", color: "#e9edf5", border: "1px solid #283041", borderRadius: 12, padding: "10px 12px", fontSize: 14, resize: "vertical", fontFamily: "inherit" },
  submit: { width: "100%", marginTop: 14, padding: "13px 16px", borderRadius: 12, border: "none", background: "#3fd6c0", color: "#06231f", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  err: { marginTop: 12, color: "#ff7a93", fontSize: 13 },
  fine: { textAlign: "center", color: "#6b7383", fontSize: 11, marginTop: 12, marginBottom: 0 },
  thanks: { textAlign: "center", padding: "12px 0 4px" },
  check: { width: 54, height: 54, borderRadius: "50%", background: "rgba(63,214,192,.14)", color: "#3fd6c0", display: "grid", placeItems: "center", fontSize: 26, margin: "0 auto 14px" },
};
