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

/** Each group gets its own paint, so the four sections read apart at a glance. */
const GROUP_COLOR = ["var(--v-ml)", "var(--v-llm)", "var(--v-code)", "var(--v-both)"];

function Row({ id, answer, index, color }: { id: string; answer?: Answer; index: number; color: string }) {
  const reduce = useReducedMotion();
  const r = answer ? read(id, answer) : null;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: reduce ? 0 : index * 0.03, type: "spring", stiffness: 300, damping: 26 }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2"
    >
      <span className="text-[14px] text-[var(--dim)]">{TILE_LABEL[id] ?? id}</span>
      {r ? (
        r.fired ? (
          <span className="rounded-md bg-[var(--v-ml)] px-1.5 py-0.5 font-mono text-[12px] font-bold text-[var(--on-color)]">
            {r.text} ✕
          </span>
        ) : (
          <span className="font-mono text-[13px] font-medium tabular-nums text-[var(--text)]">{r.text}</span>
        )
      ) : (
        <span className="h-3 w-10 animate-pulse rounded bg-[var(--line)]" />
      )}

      {/* The bar is the number, said again. */}
      <div className="col-span-2 h-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
        <motion.div
          className="h-full origin-left rounded-full"
          style={{ background: r?.fired ? "var(--v-ml)" : color }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: r ? Math.max(r.value, 0.03) : 0 }}
          transition={{ delay: reduce ? 0 : index * 0.03 + 0.05, duration: reduce ? 0 : 0.55, ease: [0.16, 1, 0.3, 1] }}
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
    <div className="grid gap-3 md:grid-cols-2">
      {GROUPS.map((g, n) => {
        const color = GROUP_COLOR[n % GROUP_COLOR.length]!;
        return (
          <section key={g.title} className="rounded-2xl border-2 border-[var(--line-soft)] bg-[var(--bg-lift)] p-4 sm:p-5">
            <div className="mb-2 flex flex-col gap-1.5">
              <h4 className="w-fit rounded-md px-2 py-0.5 text-[13px] font-extrabold text-[var(--on-color)]" style={{ background: color }}>
                {g.title}
              </h4>
              <p className="text-[13px] text-[var(--faint)]">{g.note}</p>
            </div>
            <ul>
              {g.ids.map((id) => (
                <Row key={id} id={id} answer={pending ? undefined : answers?.[id]} index={i++} color={color} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
