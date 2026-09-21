"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Verdict } from "@/lib/verdict";
import { VERDICT_COLOR, VERDICT_GIST } from "@/components/verdict-meta";

/** The answer, readable in about two seconds. Everything else is below it. */
export default function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const reduce = useReducedMotion();
  const color = VERDICT_COLOR[verdict.kind];

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
