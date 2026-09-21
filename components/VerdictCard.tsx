import type { VerdictRecord } from "@/lib/verdict";

const KIND_COLOR: Record<VerdictRecord["verdict"]["kind"], string> = {
  just_write_code: "var(--v-just-write-code)",
  jev_fits: "var(--v-jev-fits)",
  use_an_llm: "var(--v-use-an-llm)",
  jev_plus_llm: "var(--v-jev-plus-llm)",
  classical_ml: "var(--v-classical-ml)",
  not_enough_to_judge: "var(--v-not-enough)",
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function VerdictCard({ record }: { record: VerdictRecord }) {
  const { verdict } = record;
  const color = KIND_COLOR[verdict.kind];

  return (
    <section
      className="flex flex-col gap-8 rounded-lg border p-5 sm:p-8"
      style={{ borderColor: "var(--border)", background: "var(--bg-raised)" }}
    >
      {/* 1. Headline verdict */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: color }}
          />
          <h2 className="text-2xl font-semibold tracking-tight">{verdict.headline}</h2>
          {verdict.provisional && (
            <span
              className="rounded-full border px-2 py-0.5 text-xs font-mono uppercase tracking-wide"
              style={{ borderColor: color, color }}
            >
              provisional
            </span>
          )}
        </div>
        {verdict.provisional && (
          <p className="text-sm text-[var(--text-dim)]">
            This verdict is provisional. {verdict.whatWouldChangeThis}
          </p>
        )}
      </div>

      {/* 2. One-line why */}
      <p className="text-lg leading-relaxed text-[var(--text)]">{verdict.why}</p>

      {/* fitScore, when present */}
      {verdict.fitScore !== null && (
        <div className="flex items-center gap-3 text-sm text-[var(--text-dim)]">
          <span className="font-mono text-[var(--text)]">{pct(verdict.fitScore)}</span>
          <span>Jev-fit composite &mdash; computed in code from the answers below, not returned by the model.</span>
        </div>
      )}

      {/* 3. Deciding judgments */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--text-faint)]">
          What decided it
        </h3>
        <ul className="flex flex-col gap-3">
          {verdict.deciding.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-1 rounded-md border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              style={{ borderColor: "var(--border-soft)" }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-[var(--text)]">{d.label}</span>
                <span className="text-sm text-[var(--text-dim)]">{d.reading}</span>
              </div>
              <span className="whitespace-nowrap font-mono text-sm text-[var(--text)]">
                {pct(d.certainty)} certain
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--text-faint)]">
          Certainty is not one scale: for a yes/no judgment it is distance from
          &ldquo;as likely as not&rdquo;; for a choice or score it is the
          model&apos;s own confidence. Each row stands on its own.
        </p>
      </div>

      {/* 4. What we assumed */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--text-faint)]">
          What we assumed
        </h3>
        {verdict.assumptions.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">
            Nothing. The description stated everything that mattered for this
            verdict.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {verdict.assumptions.map((a) => (
              <li key={a.id} className="text-sm text-[var(--text-dim)]">
                <span className="text-[var(--text)]">{a.dimension}:</span> {a.assumed}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 5. What would change this */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-mono uppercase tracking-widest text-[var(--text-faint)]">
          What would change this
        </h3>
        <p className="text-sm text-[var(--text-dim)]">{verdict.whatWouldChangeThis}</p>
      </div>

      {/* 6. Model version */}
      <div className="flex flex-col gap-1 border-t pt-4" style={{ borderColor: "var(--border-soft)" }}>
        <p className="font-mono text-xs text-[var(--text-faint)]">
          judged by {verdict.modelVersion}
        </p>
        <p className="text-xs text-[var(--text-faint)]">
          Jev&apos;s strengths and weaknesses are specific to this model version;
          a newer one may judge this differently.
        </p>
      </div>

      {/* 7. Show your work */}
      <details className="rounded-md border" style={{ borderColor: "var(--border-soft)" }}>
        <summary className="flex select-none items-center gap-2 px-4 py-3 text-sm text-[var(--text-dim)]">
          <span className="chevron">&#9656;</span>
          Show your work
        </summary>
        <div className="flex flex-col gap-4 border-t px-4 py-4" style={{ borderColor: "var(--border-soft)" }}>
          <WorkBlock label="state" value={record.work.state} />
          <WorkBlock label="questions" value={record.work.questions} />
          <WorkBlock label="answers" value={record.work.answers} />
        </div>
      </details>
    </section>
  );
}

function WorkBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-mono uppercase tracking-widest text-[var(--text-faint)]">
        {label}
      </span>
      <pre
        className="overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed text-[var(--text)]"
        style={{ background: "var(--bg-inset)" }}
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
