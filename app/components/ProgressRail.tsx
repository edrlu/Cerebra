"use client";

import { Fragment } from "react";

// The three-stage narrative that replaces the old two-tab nav. The rail is both
// wayfinding and story: Create an ad → Measure how the brain responds → Refine
// the weak moments. Steps are always reachable (each stage owns its own empty
// state), so the rail never dead-ends.
export type Stage = "create" | "measure" | "refine";

const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "create", label: "Create", hint: "Generate an ad" },
  { id: "measure", label: "Measure", hint: "See the brain respond" },
  { id: "refine", label: "Refine", hint: "Cut & regenerate" },
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
