"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Answer } from "@/lib/jev/types";
import { BLOCKING, GROUPS, TILE_LABEL } from "@/components/verdict-meta";

/**
 * The reveal. Nineteen typed judgments landing at once, shown as they resolve.
 *
 * The stagger is presentation, not inference: every question in the grid was
 * answered in ONE request, in parallel. The header says so, because the fact
 * that it is one round trip is the interesting part.
 */

type Reading = { text: string; value: number; fired: boolean; kind: "noul" | "choice" | "score" };

function read(id: string, a: Answer): Reading {
  if (a.type === "noul") {
    const fired = a.noul >= 0.6;
    return {
      text: fired ? "yes" : a.noul <= 0.4 ? "no" : "either way",
      value: a.noul,
      fired: fired && BLOCKING.has(id),
      kind: "noul",
    };
  }
  if (a.type === "score") {
    // Same reading as the share card: the scale comes from the legend, which
    // always carries every level, not from the probabilities, which drop the
    // ones with negligible mass. Levels are zero-indexed, so a reader sees
    // level + 1 — otherwise the lowest level of four reads "0 of 3", which
    // looks like nothing rather than like the bottom of the scale.
    const levels = Object.keys(a.legend).length;
    return {
      text: `${Math.round(a.score) + 1} of ${levels}`,
      value: levels > 1 ? a.score / (levels - 1) : 0,
      fired: false,
      kind: "score",
    };
  }
  return { text: a.choice.replace(/_/g, " "), value: a.confidence, fired: false, kind: "choice" };
}

function Tile({ id, answer, index }: { id: string; answer?: Answer; index: number }) {
  const reduce = useReducedMotion();
  const r = answer ? read(id, answer) : null;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : index * 0.035, type: "spring", stiffness: 260, damping: 24 }}
      className="relative overflow-hidden rounded-xl border bg-[var(--bg-lift)] px-3 py-2.5"
      style={{ borderColor: r?.fired ? "rgb(255 122 156 / 0.45)" : "var(--line-soft)" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] leading-tight text-[var(--dim)]">{TILE_LABEL[id] ?? id}</span>
        {r ? (
          <motion.span
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: reduce ? 0 : index * 0.035 + 0.08 }}
            className="shrink-0 font-[family-name:var(--font-mono)] text-[13px] tabular-nums"
            style={{ color: r.fired ? "var(--v-ml)" : "var(--text)" }}
          >
            {r.text}
          </motion.span>
        ) : (
          <span className="h-3 w-8 shrink-0 animate-pulse rounded bg-[var(--line)]" />
        )}
      </div>

      {/* A hairline, not a filled track: the bar is the number, said again. */}
      <div className="mt-2 h-px w-full bg-[var(--line)]">
        <motion.div
          className="h-px origin-left"
          style={{ background: r?.fired ? "var(--v-ml)" : "var(--accent)" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: r ? Math.max(r.value, 0.02) : 0 }}
          transition={{ delay: reduce ? 0 : index * 0.035 + 0.05, duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </motion.li>
  );
}

export default function JudgmentGrid({
  answers,
  pending,
}: {
  answers?: Record<string, Answer>;
  pending?: boolean;
}) {
  let i = 0;
  return (
    <div className="flex flex-col gap-7">
      {GROUPS.map((g) => (
        <section key={g.title}>
          <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-sm font-medium">{g.title}</h3>
            <p className="text-[13px] text-[var(--faint)]">{g.note}</p>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {g.ids.map((id) => (
              <Tile key={id} id={id} answer={pending ? undefined : answers?.[id]} index={i++} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
