"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Gap } from "@/lib/verdict";

/**
 * Vague descriptions are the normal case, so this is the opposite of an error
 * state: it shows exactly which half is missing and hands the visitor concrete
 * phrases to tap. Refusing to rule is only acceptable if you say what you need.
 */
export default function SharpenPanel({
  gaps,
  sharpness,
  onAdd,
}: {
  gaps: Gap[];
  sharpness: number;
  onAdd: (key: Gap["key"], phrase: string) => void;
}) {
  const reduce = useReducedMotion();
  if (gaps.length === 0) return null;

  return (
    <div className="flex flex-col gap-5 border-t border-[var(--text)] pt-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-3xl leading-tight">Sharpen it</h3>
          <span className="font-mono text-[13px] text-[var(--faint)]">
            {gaps.length} of 3 missing
          </span>
        </div>
        <div className="h-[3px] w-full overflow-hidden bg-[var(--line)]">
          <motion.div
            className="h-full bg-[var(--accent)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.max(sharpness, 0.04) }}
            style={{ transformOrigin: "left" }}
            transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="text-[13px] text-[var(--dim)]">
          Tap anything below to add it to your description, then run it again.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {gaps.map((gap) => (
          <div key={gap.key} className="flex flex-col gap-2">
            <p className="text-sm text-[var(--text)]">{gap.ask}</p>
            <div className="flex flex-wrap gap-2">
              {gap.chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => onAdd(gap.key, chip)}
                  className="border border-[var(--line)] bg-[var(--bg-lift)] px-2.5 py-1 text-[13px] text-[var(--dim)] transition hover:border-[var(--text)] hover:text-[var(--text)] active:translate-y-px"
                >
                  <span className="mr-1.5 font-mono text-[var(--accent)]">+</span>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
