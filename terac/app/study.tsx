"use client";

import { useEffect, useMemo, useState } from "react";
import { randomPair, type VideoAsset } from "./videos";

type Choice = "a" | "b";
type Answers = { closer: Choice | null; attention: Choice | null; memorable: Choice | null; glance: Choice | null; rationale: string };
const emptyAnswers = (): Answers => ({ closer: null, attention: null, memorable: null, glance: null, rationale: "" });
const questions: { key: Exclude<keyof Answers, "rationale">; text: string }[] = [
  { key: "closer", text: "Which clip were you watching more closely?" },
  { key: "attention", text: "Which clip held your attention more?" },
  { key: "memorable", text: "Which clip was more memorable?" },
  { key: "glance", text: "Which clip was easier to understand at a glance?" },
];

export function Study() {
  const [pair, setPair] = useState<{ a: VideoAsset; b: VideoAsset } | null>(null); const [sessionId, setSessionId] = useState(""); const [answers, setAnswers] = useState<Answers>(emptyAnswers); const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle"); const [message, setMessage] = useState(""); const [broken, setBroken] = useState<number[]>([]);
  useEffect(() => { setPair(randomPair()); setSessionId(crypto.randomUUID()); }, []);
  const canContinue = useMemo(() => Boolean(answers.closer && answers.attention && answers.memorable && answers.glance && answers.rationale.trim()), [answers]);
  const choose = (key: Exclude<keyof Answers, "rationale">, value: Choice) => setAnswers((current) => ({ ...current, [key]: value }));
  const markBroken = (id: number) => setBroken((current) => current.includes(id) ? current : [...current, id]);

  async function save() {
    if (!canContinue || state === "saving") return;
    setState("saving"); setMessage("");
    try {
      if (!pair) return;
      const response = await fetch("/api/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participant_session_id: sessionId, trial_index: 1, video_a: pair.a.label, video_b: pair.b.label, question_1: answers.closer, question_2: answers.attention, question_3: answers.memorable, question_4: answers.glance, question_5: answers.rationale.trim() }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "We couldn’t save that response.");
      setState("done");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "We couldn’t save that response."); }
  }

  if (state === "done") return <main className="shell finish"><div className="mark">✓</div><p className="eyebrow">Response saved</p><h1>That’s the cut.</h1><p>Thanks for giving both clips your attention. Reload for another random comparison.</p></main>;
  if (!pair) return <main className="shell loading"><div className="mark">C</div><p className="eyebrow">Selecting two clips</p></main>;
  return <main className="shell"><header><div className="brand"><span className="mark">C</span> CUT TEST</div><span>PAIRED VIDEO STUDY · 5 SEC CLIPS</span></header><section className="intro"><div><p className="eyebrow">Your first impression matters</p><h1>Watch both.<br />Then trust your gut.</h1></div><p>There are no right answers. Use the clip labels to keep your choices straight.</p></section><section className="progress"><div><span>ONE RANDOM COMPARISON</span><span>5 QUESTIONS</span></div><i><b style={{ width: "100%" }} /></i></section>
    <section className="clips"><div className="clips-head"><b>Two clips. One comparison.</b><span>Each clip is approximately 5 seconds.</span></div><div className="clip-grid">{([{ video: pair.a, letter: "A" }, { video: pair.b, letter: "B" }]).map(({ video, letter }) => <article key={video.id}><div className="clip-label"><span>CLIP {letter}</span><b>{video.label}</b></div><video controls preload="metadata" playsInline onError={() => markBroken(video.id)}><source src={video.src} type="video/mp4" /></video>{broken.includes(video.id) && <p className="stream-error">This local video file could not be loaded. Check public/mp4s for the matching filename.</p>}</article>)}</div></section>
    <section className="questions"><p className="eyebrow">Your response</p><h2>Which one stayed with you?</h2>{questions.map((question, index) => <div className="question" key={question.key}><em>0{index + 1}</em><div><strong>{question.text}</strong><div className="choices">{(["a", "b"] as const).map((choice) => <button key={choice} className={answers[question.key] === choice ? "selected" : ""} onClick={() => choose(question.key, choice)}><small>CLIP {choice.toUpperCase()}</small>{choice === "a" ? pair.a.label : pair.b.label}</button>)}</div></div></div>)}<div className="question"><em>05</em><div><strong>In a few words or one sentence, why did you choose that clip?</strong><textarea value={answers.rationale} onChange={(event) => setAnswers((current) => ({ ...current, rationale: event.target.value }))} placeholder="For example: the opening was clearer and the visual idea landed immediately." /></div></div><div className="actions"><p className={state === "error" ? "error" : ""}>{state === "saving" ? "Saving your response…" : message || "Your answer is saved securely."}</p><button disabled={!canContinue || state === "saving"} onClick={save}>{state === "saving" ? "Saving…" : "Save response"}</button></div></section>
  </main>;
}
