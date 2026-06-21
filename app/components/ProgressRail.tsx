"use client";

import { Fragment } from "react";

// Two-tab narrative: Create an ad → Refine it in front of the living brain.
// "Measure" is no longer a separate place — seeing how the brain responds and
// cutting/regenerating the weak moments now happen together in Refine. The rail
// is both wayfinding and story; both steps are always reachable (each stage owns
// its own empty state), so the rail never dead-ends.
export type Stage = "create" | "refine";

const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "create", label: "Create", hint: "Generate an ad" },
  { id: "refine", label: "Refine", hint: "Watch the brain respond · cut & regenerate" },
];

export function ProgressRail({ stage, onStage }: { stage: Stage; onStage: (s: Stage) => void }) {
  const currentIndex = STAGES.findIndex((s) => s.id === stage);
  return (
    <nav className="progress-rail" aria-label="Workflow stages">
      {STAGES.map((s, i) => {
        const state = s.id === stage ? "current" : i < currentIndex ? "done" : "upcoming";
        return (
          <Fragment key={s.id}>
            {i > 0 && <span className="rail-conn" aria-hidden />}
            <button
              type="button"
              className={`rail-step ${state}`}
              aria-current={s.id === stage ? "step" : undefined}
              title={s.hint}
              onClick={() => onStage(s.id)}
            >
              <span className="rail-index" aria-hidden>{i + 1}</span>
              <span className="rail-label">{s.label}</span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
