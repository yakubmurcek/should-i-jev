"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Verdict } from "@/lib/verdict";
import type { Answer } from "@/lib/jev/types";
import { read } from "@/components/JudgmentGrid";
import { STAMP, TILE_LABEL, VERDICT_COLOR } from "@/components/verdict-meta";

/** The answer, readable in about two seconds. Everything else is below it. */
export default function VerdictBanner({
  verdict,
  answers = {},
  as: Heading = "h2",
}: {
  verdict: Verdict;
  answers?: Record<string, Answer>;
  /** h1 on a verdict's own page, where the verdict is the page's topic. */
  as?: "h1" | "h2";
}) {
  const reduce = useReducedMotion();
  const color = VERDICT_COLOR[verdict.kind];
  // The two or three answers that moved it most, so "why" is visible without
  // opening anything.
  const top = [...verdict.deciding].sort((a, b) => b.weight - a.weight).slice(0, 3);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative rounded-3xl p-6 text-[var(--on-color)] sm:p-9"
      style={{ background: color }}
    >
      <span className="absolute -top-3 left-6 -rotate-3 rounded-lg bg-[var(--bg)] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--text)] sm:left-9">
        verdict
      </span>
      <div className="flex flex-col gap-3">
        <Heading className="text-[3.2rem] font-extrabold leading-[0.9] tracking-[-0.04em] sm:text-8xl">
          {STAMP[verdict.kind].headline}
        </Heading>
        <p className="max-w-[40ch] text-xl font-bold leading-snug sm:text-2xl">
          {STAMP[verdict.kind].sub}
        </p>
        <p className="max-w-[66ch] text-[15px] font-medium leading-relaxed opacity-75">
          {verdict.why.charAt(0).toUpperCase() + verdict.why.slice(1)}.
        </p>

        {top.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="What decided it">
            {top.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-full bg-[var(--bg)] px-3.5 py-1.5 text-[13px]"
              >
                <span className="text-[var(--dim)]">{TILE_LABEL[d.id] ?? d.id}</span>
                {answers[d.id] && (
                  <span className="font-mono font-bold" style={{ color }}>
                    {read(d.id, answers[d.id]!).text}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {verdict.provisional && (
          <p className="mt-1 w-fit rounded-full border-2 border-[var(--on-color)] px-3 py-1 text-[14px] font-bold">
            Provisional. Do not let it act alone.
          </p>
        )}
      </div>
    </motion.div>
  );
}
