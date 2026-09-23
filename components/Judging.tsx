"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/**
 * Stands where the verdict will land, so the wait reads as work in progress
 * rather than a blank page. The steps are honest about what happens (one
 * request, nineteen questions, code composes the verdict) but their timing is
 * presentation: the real request is a single round trip.
 */
const STEPS = [
  "Sending your feature to Jev",
  "Asking nineteen questions at once",
  "Checking it against what Jev is bad at",
  "Weighing the answers into a verdict",
];

const STEP_MS = 1400;

export default function Judging() {
  const reduce = useReducedMotion();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const t = setInterval(() => setElapsed(performance.now() - start), 100);
    return () => clearInterval(t);
  }, []);

  const step = Math.min(Math.floor(elapsed / STEP_MS), STEPS.length - 1);
  // Fills fast, then crawls toward the end without ever claiming to be done.
  const progress = 1 - Math.exp(-elapsed / 3500);

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-3xl border-2 border-dashed border-[var(--accent)] bg-[var(--bg-lift)] p-6 sm:p-9"
    >
      <span className="absolute -top-px left-6 -translate-y-1/2 -rotate-3 rounded-lg bg-[var(--accent)] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--accent-ink)] sm:left-9">
        judging
      </span>

      <div className="flex flex-col gap-6">
        <div className="flex items-end justify-between gap-4">
          <p className="text-[2.6rem] font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
            Jev is on it
            <Dots />
          </p>
          <span className="shrink-0 font-mono text-[13px] tabular-nums text-[var(--faint)]">
            {(elapsed / 1000).toFixed(1)}s
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full origin-left rounded-full bg-[var(--accent)] transition-transform duration-100 ease-linear"
            style={{ transform: `scaleX(${Math.max(progress, 0.04)})` }}
          />
        </div>

        <ol className="flex flex-col gap-2.5">
          {STEPS.map((s, i) => {
            const state = i < step ? "done" : i === step ? "now" : "todo";
            return (
              <li key={s} className="flex items-center gap-3 text-[15px]">
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[12px] font-bold transition-colors"
                  style={{
                    background: state === "todo" ? "var(--line-soft)" : state === "done" ? "var(--v-fits)" : "var(--accent)",
                    color: state === "todo" ? "var(--faint)" : "var(--on-color)",
                  }}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={state}
                    initial={reduce ? false : { opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={
                      state === "now"
                        ? "font-bold text-[var(--text)]"
                        : state === "done"
                          ? "text-[var(--dim)]"
                          : "text-[var(--faint)]"
                    }
                  >
                    {s}
                  </motion.span>
                </AnimatePresence>
              </li>
            );
          })}
        </ol>

        {elapsed > 9000 && (
          <p className="text-[14px] text-[var(--dim)]">
            Still going. Some runs take a few extra seconds, and it retries on its own if TypeSafe is busy.
          </p>
        )}
      </div>
    </div>
  );
}

function Dots() {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className="inline-flex">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={reduce ? undefined : { opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        >
          .
        </motion.span>
      ))}
    </span>
  );
}
