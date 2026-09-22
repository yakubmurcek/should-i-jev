import Studio from "@/components/Studio";
import { LEGEND, VERDICT_COLOR } from "@/components/verdict-meta";
import { VERDICT_HEADLINES } from "@/lib/verdict";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
      <header className="flex flex-col gap-5">
        <p className="flex items-center gap-2 text-[13px] font-medium tracking-wide text-[var(--dim)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
          Should I Jev?
        </p>
        <h1 className="max-w-[18ch] text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Does your feature actually need an&nbsp;LLM?
        </h1>
        <p className="max-w-[58ch] text-lg leading-relaxed text-[var(--dim)] sm:text-xl">
          Describe it in a sentence. Nineteen typed checks rule on what should power it, and hand
          you a starting point. The most common answer is{" "}
          <span className="text-[var(--v-code)]">just write code</span>.
        </p>

        <ol className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Possible verdicts, cheapest first">
          {LEGEND.map(({ kind, cost }) => (
            <li
              key={kind}
              className="flex flex-col gap-1 rounded-xl border border-[var(--line-soft)] bg-[var(--bg-lift)] px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-[14px] font-medium" style={{ color: VERDICT_COLOR[kind] }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: VERDICT_COLOR[kind] }} />
                {VERDICT_HEADLINES[kind]}
              </span>
              <span className="text-[12px] text-[var(--faint)]">{cost}</span>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-[var(--faint)]">
          <a href="https://typesafe.ai" target="_blank" rel="noreferrer" className="text-[var(--dim)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--text)]">
            Jev
          </a>{" "}
          returns typed judgments instead of prose, so it sits between an{" "}
          <code className="font-[family-name:var(--font-mono)] text-[var(--text)]">if</code> and an LLM.
        </p>
      </header>

      <Studio />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-6 text-[13px] text-[var(--faint)]">
        <span>Built on Jev by TypeSafe. Every verdict links to its full working.</span>
        <a
          href="https://github.com/yakubmurcek/should-i-jev"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-[var(--text)]"
        >
          Open source on GitHub
        </a>
      </footer>
    </main>
  );
}
