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
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
      style={{ borderColor: `color-mix(in oklab, ${color} 35%, transparent)` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(120% 90% at 0% 0%, color-mix(in oklab, ${color} 11%, transparent), transparent 62%)` }}
      />
      <div className="relative flex flex-col gap-3">
        <h2
          className="text-3xl font-semibold tracking-tight sm:text-5xl"
          style={{ color }}
        >
          {verdict.headline}
        </h2>
        <p className="max-w-[48ch] text-lg text-[var(--text)] sm:text-xl">
          {VERDICT_GIST[verdict.kind]}
        </p>
        <p className="max-w-[68ch] text-[15px] leading-relaxed text-[var(--dim)]">
          {verdict.why.charAt(0).toUpperCase() + verdict.why.slice(1)}.
        </p>

        {top.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="What decided it">
            {top.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--bg)]/60 px-3 py-1 text-[13px]"
              >
                <span className="text-[var(--dim)]">{TILE_LABEL[d.id] ?? d.id}</span>
                {answers[d.id] && (
                  <span className="font-[family-name:var(--font-mono)]" style={{ color }}>
                    {read(d.id, answers[d.id]!).text}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}

        {verdict.provisional && (
          <p
            className="mt-1 w-fit rounded-full border px-3 py-1 text-[13px]"
            style={{ borderColor: "rgb(255 180 84 / 0.4)", color: "var(--v-llm)" }}
          >
            Provisional. Do not let it act alone.
          </p>
        )}
      </div>
    </motion.div>
  );
}
