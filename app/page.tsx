import Studio from "@/components/Studio";
import Masthead from "@/components/Masthead";
import { LEGEND, VERDICT_COLOR } from "@/components/verdict-meta";
import { VERDICT_HEADLINES } from "@/lib/verdict";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-24 pt-6 sm:px-6 sm:pt-10">
      <header className="flex flex-col gap-8">
        <Masthead right="Nineteen checks · one request" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-12">
          <h1 className="font-serif text-[2.9rem] leading-[0.98] tracking-[-0.01em] sm:text-7xl">
            Does your feature actually need an <em className="text-[var(--accent)]">LLM?</em>
          </h1>
          <p className="max-w-[46ch] text-[17px] leading-relaxed text-[var(--dim)]">
            Describe it in a sentence. Nineteen typed checks rule on what should power it and hand
            you a starting point. The most common answer is{" "}
            <span className="font-medium text-[var(--v-code)]">just write code</span>.
          </p>
        </div>

        <ol
          className="grid grid-cols-1 border-t border-[var(--line)] sm:grid-cols-5"
          aria-label="Possible verdicts, cheapest first"
        >
          {LEGEND.map(({ kind, cost }, i) => (
            <li
              key={kind}
              className="flex items-baseline gap-3 border-b border-[var(--line)] py-3 sm:flex-col sm:gap-1.5 sm:border-b-0 sm:border-l sm:px-3 sm:first:border-l-0 sm:first:pl-0"
            >
              <span className="font-mono text-[11px] text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[15px] font-medium" style={{ color: VERDICT_COLOR[kind] }}>
                {VERDICT_HEADLINES[kind]}
              </span>
              <span className="ml-auto text-[13px] text-[var(--faint)] sm:ml-0">{cost}</span>
            </li>
          ))}
        </ol>
        <p className="-mt-4 text-[13px] text-[var(--faint)]">
          Cheapest first.{" "}
          <a href="https://typesafe.ai" target="_blank" rel="noreferrer" className="text-[var(--dim)] underline decoration-[var(--line)] underline-offset-4 hover:text-[var(--text)] hover:decoration-[var(--accent)]">
            Jev
          </a>{" "}
          returns typed judgments instead of prose, so it sits between an{" "}
          <code className="font-mono text-[var(--text)]">if</code> and an LLM.
        </p>
      </header>

      <Studio />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--text)] pt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--faint)]">
        <span>Built on Jev by TypeSafe · every verdict links to its working</span>
        <a
          href="https://github.com/yakubmurcek/should-i-jev"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-[var(--accent)]"
        >
          Source on GitHub ↗
        </a>
      </footer>
    </main>
  );
}
