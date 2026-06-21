"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

// Results / eval view for a pairwise matchup: per-question MODEL pick vs the live
// HUMAN vote, plus the pooled before/after — how often an equal-weighted model
// agrees with humans vs. a model whose dimension weights were learned from the
// human votes. Open at /compare/results?round=<id>.

type Pick = "a" | "b" | "tie";
type DimAgg = { key: string; short: string; question: string; color: string; a: number; b: number; n: number; humanPick: Pick; humanMarginPct: number; modelPick: Pick; agree: boolean | null };
type Matchup = { id: string; a: { label: string }; b: { label: string } };
type Eval = { n: number; nMatchups: number; beforeAcc: number; afterAcc: number; weights: Record<string, number>; weightsNorm: Record<string, number>; fitReliable: boolean };

const SHORT: Record<string, string> = { auditory_engagement: "AUD", language_message: "LANG", attention_salience: "ATTN", visual_motion: "VIS" };

export default function ResultsPage() {
  const [round, setRound] = useState("");
  const [matchup, setMatchup] = useState<Matchup | null>(null);
  const [dims, setDims] = useState<DimAgg[]>([]);
  const [agreePct, setAgreePct] = useState(0);
  const [evalData, setEvalData] = useState<Eval | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    try {
      const [mRes, eRes] = await Promise.all([
        fetch(`/api/compare?round=${encodeURIComponent(id)}`, { cache: "no-store" }),
        fetch(`/api/compare?eval=1`, { cache: "no-store" }),
      ]);
      const mData = await mRes.json();
      if (!mRes.ok) throw new Error(mData?.error || "Could not load matchup.");
      setMatchup(mData.matchup);
      setDims(mData.aggregate?.dims ?? []);
      setAgreePct(mData.aggregate?.agreementPct ?? 0);
      if (eRes.ok) setEvalData(await eRes.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load results.");
    }
  }, []);

  useEffect(() => {
    const id = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("round") || "" : "";
    setRound(id);
    if (!id) return;
    load(id);
    const t = setInterval(() => load(id), 5000); // live poll
    return () => clearInterval(t);
  }, [load]);

  const lift = evalData ? Math.round((evalData.afterAcc - evalData.beforeAcc) * 100) : 0;

  return (
    <main style={S.shell}>
      <div style={S.card}>
        <div style={S.brand}><span style={S.dot} /> CEREBRA · MODEL vs HUMANS</div>
        {!round ? (
          <p style={S.muted}>Add <code>?round=&lt;id&gt;</code> to the URL to view a matchup&apos;s results.</p>
        ) : error ? (
          <p style={S.muted}>{error}</p>
        ) : !matchup ? (
          <p style={S.muted}>Loading results…</p>
        ) : (
          <>
            <h1 style={S.h1}>Did TRIBE predict what people actually preferred?</h1>
            <p style={S.muted}>
              <b style={{ color: "#3fd6c0" }}>A · {matchup.a.label}</b> vs <b style={{ color: "#ffb13b" }}>B · {matchup.b.label}</b>
              {" · "}model agrees with humans on <b>{agreePct}%</b> of decided questions.
            </p>

            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Question</th>
                  <th style={S.thC}>Model</th>
                  <th style={S.thC}>Humans</th>
                  <th style={S.thC}>Match</th>
                </tr>
              </thead>
              <tbody>
                {dims.map((d) => (
                  <tr key={d.key} style={d.key === "overall" ? S.trHero : undefined}>
                    <td style={S.td}>
                      {d.key !== "overall" && <span style={{ ...S.chip, color: d.color, borderColor: d.color }}>{d.short}</span>}
                      {d.question}
                    </td>
                    <td style={S.tdC}><span style={S.pill}>{d.modelPick.toUpperCase()}</span></td>
                    <td style={S.tdC}>
                      {d.n === 0 ? <span style={S.dim}>—</span> : d.humanPick === "tie" ? (
                        <span style={S.dim}>{d.a}-{d.b}</span>
                      ) : (
                        <span>{d.humanPick.toUpperCase()} <span style={S.dim}>({d.a}-{d.b})</span></span>
                      )}
                    </td>
                    <td style={S.tdC}>{d.agree === null ? <span style={S.dim}>—</span> : d.agree ? <span style={S.ok}>✓</span> : <span style={S.no}>✗</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 style={S.h2}>Before / after — calibrating on human votes</h2>
            {!evalData || evalData.n === 0 ? (
              <p style={S.muted}>No overall votes yet. Once people vote, this shows the accuracy lift from learning dimension weights on their choices.</p>
            ) : (
              <>
                <div style={S.beforeAfter}>
                  <div style={S.baCol}><div style={S.baNum}>{Math.round(evalData.beforeAcc * 100)}%</div><div style={S.baLbl}>Before<br />equal-weighted</div></div>
                  <div style={S.arrow}>→</div>
                  <div style={S.baCol}><div style={{ ...S.baNum, color: "#3fd6c0" }}>{Math.round(evalData.afterAcc * 100)}%</div><div style={S.baLbl}>After<br />human-calibrated</div></div>
                  <div style={{ ...S.lift, color: lift >= 0 ? "#3fd6c0" : "#ff7a93" }}>{lift >= 0 ? "+" : ""}{lift} pts</div>
                </div>
                <div style={S.weights}>
                  <div style={S.wTitle}>Dimension weights learned from {evalData.n} human vote{evalData.n === 1 ? "" : "s"}:</div>
                  {Object.entries(evalData.weightsNorm).map(([k, v]) => (
                    <div key={k} style={S.wRow}>
                      <span style={S.wLbl}>{SHORT[k] || k}</span>
                      <div style={S.wBarBg}><div style={{ ...S.wBar, width: `${Math.round(v * 100)}%` }} /></div>
                      <span style={S.wVal}>{Math.round(v * 100)}%</span>
                    </div>
                  ))}
                </div>
                {!evalData.fitReliable && (
                  <p style={S.note}>⚠ Calibration needs ≥2 matchups with different score profiles to separate the dimensions. Run another A/B to make the learned weights meaningful.</p>
                )}
              </>
            )}
            <p style={S.fine}>Live · refreshes every 5s · {evalData ? `${evalData.nMatchups} matchup(s) pooled` : ""}</p>
          </>
        )}
      </div>
    </main>
  );
}

const S: Record<string, CSSProperties> = {
  shell: { minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b0d12", color: "#e9edf5", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: 20 },
  card: { width: "min(760px, 100%)", background: "#12151c", border: "1px solid #232936", borderRadius: 18, padding: 24, boxShadow: "0 24px 60px rgba(0,0,0,.45)" },
  brand: { display: "flex", alignItems: "center", gap: 8, fontSize: 11, letterSpacing: ".14em", color: "#9aa3b2", fontWeight: 700, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#3fd6c0", display: "inline-block" },
  h1: { fontSize: 22, margin: "0 0 6px", fontWeight: 650 },
  h2: { fontSize: 15, margin: "22px 0 10px", fontWeight: 650, color: "#cdd4e0" },
  muted: { color: "#9aa3b2", fontSize: 14, margin: "0 0 12px", lineHeight: 1.5 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th: { textAlign: "left", padding: "8px 8px", color: "#7e8696", fontWeight: 600, borderBottom: "1px solid #232936", fontSize: 12 },
  thC: { textAlign: "center", padding: "8px 8px", color: "#7e8696", fontWeight: 600, borderBottom: "1px solid #232936", fontSize: 12 },
  td: { padding: "10px 8px", borderBottom: "1px solid #181d27", color: "#e3e8f1" },
  tdC: { padding: "10px 8px", borderBottom: "1px solid #181d27", textAlign: "center" },
  trHero: { background: "#131820" },
  chip: { fontSize: 10, fontWeight: 800, letterSpacing: ".06em", border: "1px solid", borderRadius: 6, padding: "1px 5px", marginRight: 8 },
  pill: { display: "inline-block", minWidth: 26, padding: "2px 8px", borderRadius: 999, background: "#1d2330", color: "#cdd4e0", fontWeight: 800, fontSize: 12 },
  dim: { color: "#6b7383" },
  ok: { color: "#3fd6c0", fontWeight: 800 },
  no: { color: "#ff7a93", fontWeight: 800 },
  beforeAfter: { display: "flex", alignItems: "center", gap: 18, justifyContent: "center", padding: "8px 0 16px" },
  baCol: { textAlign: "center" },
  baNum: { fontSize: 34, fontWeight: 800, lineHeight: 1 },
  baLbl: { fontSize: 11, color: "#9aa3b2", marginTop: 6, lineHeight: 1.3 },
  arrow: { fontSize: 24, color: "#4a5365" },
  lift: { fontSize: 14, fontWeight: 800, marginLeft: 6 },
  weights: { marginTop: 4 },
  wTitle: { fontSize: 12, color: "#9aa3b2", marginBottom: 8 },
  wRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  wLbl: { width: 48, fontSize: 12, fontWeight: 700, color: "#cdd4e0" },
  wBarBg: { flex: 1, height: 10, background: "#0c0f15", borderRadius: 999, overflow: "hidden", border: "1px solid #1d2330" },
  wBar: { height: "100%", background: "#3fd6c0", borderRadius: 999 },
  wVal: { width: 40, textAlign: "right", fontSize: 12, color: "#9aa3b2" },
  note: { marginTop: 12, color: "#ffce47", fontSize: 12, lineHeight: 1.4 },
  fine: { textAlign: "center", color: "#6b7383", fontSize: 11, marginTop: 16, marginBottom: 0 },
};
