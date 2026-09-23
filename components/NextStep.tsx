"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import type { VerdictRecord } from "@/lib/verdict";
import { NEXT_STEP, VERDICT_COLOR } from "@/components/verdict-meta";

const CRITERIA: Record<string, { criteria: string; read: string }> = {
  choice: {
    criteria: `{\n        option_a: "what option_a means",\n        option_b: "what option_b means",\n      }`,
    read: `if (a.confidence > 0.85) act(a.choice);\n  else queueForHuman(a.choice);`,
  },
  noul: {
    criteria: `{ true: "when it holds", false: "when it does not" }`,
    read: `if (a.noul > 0.85) act();\n  else if (a.noul > 0.4) queueForHuman();`,
  },
  score: {
    criteria: `["lowest level", "middle level", "highest level"]`,
    read: `if (a.confidence > 0.85) act(Math.round(a.score));\n  else queueForHuman(a.score);`,
  },
};

/**
 * A starting point in the verdict's own shape: the primitive Jev picked for
 * this description, with the description as the instructions. Wire format as
 * in lib/jev/types.ts, so it runs as pasted once the options are filled in.
 */
function snippet(record: VerdictRecord): string | null {
  const { kind, modelVersion } = record.verdict;
  if (kind !== "jev_fits" && kind !== "jev_plus_llm") return null;
  const primitive = record.work.answers.primitive_fit;
  const type = primitive?.type === "choice" && primitive.choice in CRITERIA ? primitive.choice : "choice";
  const c = CRITERIA[type]!;
  const instructions = JSON.stringify(record.description.length > 110 ? `${record.description.slice(0, 107)}...` : record.description);

  return `const res = await fetch("https://api.typesafe.ai/v1/systemone", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.TYPESAFE_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "${modelVersion}",
    state: { input },
    questions: {
      decision: {
        type: "${type}",
        instructions: ${instructions},
        criteria: ${c.criteria},
      },
    },
  }),
});

const a = (await res.json()).answers.decision;
${c.read}${kind === "jev_plus_llm" ? "\n// Only now call the LLM, with a prompt narrowed to that branch." : ""}`;
}

/** The practical half: what to build on Monday, not just what to call it. */
export default function NextStep({ record }: { record: VerdictRecord }) {
  const { kind } = record.verdict;
  const step = NEXT_STEP[kind];
  const code = snippet(record);
  const color = VERDICT_COLOR[kind];
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="grid gap-6 border-t border-[var(--text)] pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-10">
      <div className="flex flex-col gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--faint)]">What to build</p>
        <h3 className="font-serif text-3xl leading-tight">{step.title}</h3>
        <ol className="flex flex-col gap-3">
          {step.steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-[var(--dim)]">
              <span className="w-5 shrink-0 pt-[2px] font-mono text-[12px]" style={{ color }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {code && (
          <a
            href="https://docs.typesafe.ai"
            target="_blank"
            rel="noreferrer"
            className="w-fit text-[13px] text-[var(--dim)] underline decoration-[var(--line)] underline-offset-4 transition hover:text-[var(--text)] hover:decoration-[var(--accent)]"
          >
            TypeSafe docs ↗
          </a>
        )}
      </div>

      {code ? (
        <div className="relative min-w-0 overflow-hidden border border-[var(--line)] bg-[var(--bg-lift)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2">
            <span className="font-mono text-[12px] text-[var(--faint)]">starter.ts</span>
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 text-[12px] text-[var(--dim)] transition hover:text-[var(--text)]"
            >
              {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed text-[var(--dim)]">
            {code}
          </pre>
        </div>
      ) : (
        <Flip text={record.verdict.whatWouldChangeThis} />
      )}
    </section>
  );
}

function Flip({ text }: { text: string }) {
  return (
    <div className="flex flex-col justify-center gap-2 border-l-2 border-[var(--accent)] bg-[var(--bg-lift)] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--faint)]">What would flip it</p>
      <p className="text-[15px] leading-relaxed text-[var(--text)]">{stripFlip(text)}</p>
    </div>
  );
}

export function stripFlip(text: string): string {
  const t = text.replace(/^What would change this:\s*/i, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}
