import Studio from "@/components/Studio";
import Masthead from "@/components/Masthead";
import MadeBy from "@/components/MadeBy";
import { LEGEND, VERDICT_COLOR } from "@/components/verdict-meta";
import { VERDICT_HEADLINES } from "@/lib/verdict";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <header className="flex flex-col gap-8">
        <Masthead right="19 checks · 1 request · built on Jev" />

        <div className="flex flex-col gap-6 pt-4 sm:pt-8">
          <h1 className="max-w-[16ch] text-[3.1rem] font-extrabold leading-[0.95] tracking-[-0.035em] sm:text-[5.5rem]">
            Does your feature actually need an{" "}
            <span className="inline-block -rotate-2 rounded-xl bg-[var(--accent)] px-3 text-[var(--accent-ink)]">LLM?</span>
          </h1>
          <p className="max-w-[52ch] text-lg leading-relaxed text-[var(--dim)] sm:text-xl">
            Describe it in a sentence. Nineteen typed checks rule on what should power it and hand
            you a starting point. Most of the time the answer is{" "}
            <span className="font-bold text-[var(--v-code)]">just write code</span>.
          </p>
        </div>

        <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-5" aria-label="Possible verdicts, cheapest first">
          {LEGEND.map(({ kind, cost }, i) => (
            <li
              key={kind}
              className={`flex flex-col justify-between gap-5 rounded-2xl p-3.5 text-[var(--on-color)] transition hover:-rotate-1 ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
              style={{ background: VERDICT_COLOR[kind] }}
            >
              <span className="font-mono text-[11px] font-bold opacity-60">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[17px] font-extrabold leading-tight tracking-tight">{VERDICT_HEADLINES[kind]}</span>
                <span className="text-[13px] font-medium opacity-70">{cost}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="-mt-3 text-[14px] text-[var(--faint)]">
          Cheapest first.{" "}
          <a href="https://typesafe.ai" target="_blank" rel="noreferrer" className="font-semibold text-[var(--dim)] underline decoration-[var(--accent)] decoration-2 underline-offset-4 hover:text-[var(--text)]">
            Jev
          </a>{" "}
          returns typed judgments instead of prose, so it sits between an{" "}
          <code className="font-mono text-[var(--text)]">if</code> and an LLM.
        </p>
      </header>

      <Studio />

      <MadeBy />
    </main>
  );
}
