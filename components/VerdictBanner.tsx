"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Verdict } from "@/lib/verdict";
import type { Answer } from "@/lib/jev/types";
import { read } from "@/components/JudgmentGrid";
import { TILE_LABEL, VERDICT_COLOR, VERDICT_GIST } from "@/components/verdict-meta";

/** The answer, readable in about two seconds. Everything else is below it. */
export default function VerdictBanner({ verdict, answers = {} }: { verdict: Verdict; answers?: Record<string, Answer> }) {
  const reduce = useReducedMotion();
  const color = VERDICT_COLOR[verdict.kind];
  // The two or three answers that moved it most, so "why" is visible without
  // opening anything.
  const top = [...verdict.deciding].sort((a, b) => b.weight - a.weight).slice(0, 3);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="border-t-[3px] bg-[var(--bg-lift)] px-5 pb-6 pt-4 sm:px-8 sm:pb-8"
      style={{ borderColor: color }}
    >
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--faint)]">Verdict</p>
        <h2 className="font-serif text-5xl leading-[0.95] sm:text-7xl" style={{ color }}>
          {verdict.headline}
        </h2>
        <p className="max-w-[48ch] text-lg font-medium text-[var(--text)] sm:text-xl">
          {VERDICT_GIST[verdict.kind]}
        </p>
        <p className="max-w-[68ch] text-[15px] leading-relaxed text-[var(--dim)]">
          {verdict.why.charAt(0).toUpperCase() + verdict.why.slice(1)}.
        </p>

        {top.length > 0 && (
          <dl
            className="mt-3 grid grid-cols-1 border-t border-[var(--line)] sm:grid-cols-3"
            aria-label="What decided it"
          >
            {top.map((d) => (
              <div
                key={d.id}
                className="flex items-baseline justify-between gap-3 border-b border-[var(--line)] py-2 sm:flex-col sm:justify-start sm:gap-0.5 sm:border-b-0 sm:border-l sm:px-3 sm:first:border-l-0 sm:first:pl-0"
              >
                <dt className="text-[13px] text-[var(--dim)]">{TILE_LABEL[d.id] ?? d.id}</dt>
                {answers[d.id] && (
                  <dd className="font-mono text-[14px]" style={{ color }}>
                    {read(d.id, answers[d.id]!).text}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        )}

        {verdict.provisional && (
          <p className="mt-1 w-fit border-l-2 border-[var(--v-llm)] pl-3 text-[14px] text-[var(--v-llm)]">
            Provisional. Do not let it act alone.
          </p>
        )}
      </div>
    </motion.div>
  );
}
