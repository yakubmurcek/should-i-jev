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

export function read(id: string, a: Answer): Reading {
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

function Row({ id, answer, index }: { id: string; answer?: Answer; index: number }) {
  const reduce = useReducedMotion();
  const r = answer ? read(id, answer) : null;
  const ink = r?.fired ? "var(--v-ml)" : "var(--text)";

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: reduce ? 0 : index * 0.03, duration: 0.25 }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 pb-1.5 pt-2.5"
    >
      <span className="flex items-baseline gap-2 text-[14px] text-[var(--dim)]">
        <span className="w-3 shrink-0 font-mono text-[12px]" style={{ color: ink }} aria-hidden>
          {r?.fired ? "✕" : ""}
        </span>
        {TILE_LABEL[id] ?? id}
      </span>
      {r ? (
        <span className="font-mono text-[13px] tabular-nums" style={{ color: ink }}>
          {r.text}
        </span>
      ) : (
        <span className="h-3 w-10 animate-pulse bg-[var(--line)]" />
      )}

      {/* A hairline under the label: the bar is the number, said again. */}
      <div className="col-span-2 ml-5 mt-1.5 h-px bg-[var(--line-soft)]">
        <motion.div
          className="h-px origin-left"
          style={{ background: r?.fired ? "var(--v-ml)" : "var(--text)" }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: r ? Math.max(r.value, 0.02) : 0 }}
          transition={{ delay: reduce ? 0 : index * 0.03 + 0.05, duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
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
    <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
      {GROUPS.map((g, n) => (
        <section key={g.title}>
          <div className="mb-1 flex flex-col gap-0.5 border-b border-[var(--text)] pb-2">
            <h4 className="flex items-baseline gap-2 text-sm font-medium">
              <span className="font-mono text-[11px] text-[var(--faint)]">{String.fromCharCode(65 + n)}</span>
              {g.title}
            </h4>
            <p className="text-[13px] text-[var(--faint)]">{g.note}</p>
          </div>
          <ul>
            {g.ids.map((id) => (
              <Row key={id} id={id} answer={pending ? undefined : answers?.[id]} index={i++} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
