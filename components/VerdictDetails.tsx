"use client";

import { useState } from "react";
import type { VerdictRecord } from "@/lib/verdict";

/**
 * Everything that is true but not urgent, folded away. The verdict is the
 * product; this is the receipt for anyone who wants to check the working.
 */
export default function VerdictDetails({ record }: { record: VerdictRecord }) {
  const { verdict, work } = record;
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (k: string) => setOpen(open === k ? null : k);

  const Row = ({ k, title, count, children }: { k: string; title: string; count?: number; children: React.ReactNode }) => (
    <div className="border-b border-[var(--line)]">
      <button
        type="button"
        onClick={() => toggle(k)}
        aria-expanded={open === k}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition hover:text-[var(--text)]"
      >
        <span className="text-[15px] text-[var(--text)]">{title}</span>
        <span className="flex items-center gap-2 font-mono text-[13px] text-[var(--faint)]">
          {count !== undefined && <span>{count}</span>}
          <span className={`transition-transform ${open === k ? "rotate-45" : ""}`}>+</span>
        </span>
      </button>
      {open === k && <div className="pb-5 text-sm leading-relaxed text-[var(--dim)]">{children}</div>}
    </div>
  );

  return (
    <div className="flex flex-col border-t border-[var(--text)]">
      <Row k="why" title="Why, in full">
        <p className="max-w-[68ch]">{verdict.why}.</p>
        <p className="mt-3 max-w-[68ch] text-[var(--text)]">{verdict.whatWouldChangeThis}</p>
      </Row>

      <Row k="deciding" title="What decided it" count={verdict.deciding.length}>
        <ul className="flex flex-col gap-3">
          {verdict.deciding.map((d) => (
            <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-[var(--text)]">{d.label}</span>
              <span className="font-mono text-[13px] tabular-nums text-[var(--faint)]">
                {d.reading} · {Math.round(d.certainty * 100)}%
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-[68ch] text-[13px] text-[var(--faint)]">
          Those percentages are not one scale. For a yes/no judgment it is distance from
          &ldquo;as likely as not&rdquo;; for a choice or a score it is the model&apos;s own confidence.
          Each stands on its own.
        </p>
      </Row>

      <Row k="assumed" title="What it assumed" count={verdict.assumptions.length}>
        {verdict.assumptions.length === 0 ? (
          <p>Your description stated everything that mattered. Nothing was filled in for you.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {verdict.assumptions.map((a) => (
              <li key={a.id}>
                <span className="text-[var(--text)]">{a.dimension}:</span> {a.assumed}
              </li>
            ))}
          </ul>
        )}
      </Row>

      <Row k="work" title="Show your work">
        <p className="mb-3 max-w-[68ch]">
          The exact state sent, every question asked, and every answer returned. One request,
          model <span className="font-mono text-[var(--text)]">{verdict.modelVersion}</span>.
          These weaknesses are specific to that version.
        </p>
        <pre className="max-h-[28rem] overflow-auto border border-[var(--line)] bg-[var(--bg-lift)] p-4 font-mono text-[12px] leading-relaxed text-[var(--dim)]">
{JSON.stringify({ state: work.state, questions: work.questions, answers: work.answers }, null, 2)}
        </pre>
      </Row>
    </div>
  );
}
