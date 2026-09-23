import Studio from "@/components/Studio";
import Masthead from "@/components/Masthead";
import MadeBy from "@/components/MadeBy";
import { LEGEND, VERDICT_COLOR } from "@/components/verdict-meta";
import { VERDICT_HEADLINES } from "@/lib/verdict";

/**
 * Jev's three answer shapes, each with a real-looking answer. A stranger should
 * see what Jev returns before they are asked whether their feature fits it.
 */
const PRIMITIVES = [
  {
    name: "Choice",
    color: "var(--v-code)",
    asks: "Which queue does this email belong in?",
    answer: `{ choice: "refund", confidence: 0.94 }`,
  },
  {
    name: "Noul",
    color: "var(--v-fits)",
    asks: "Is this listing trying to sell something banned?",
    answer: `{ noul: 0.08 }`,
  },
  {
    name: "Score",
    color: "var(--v-both)",
    asks: "How urgent is this ticket, from calm to on fire?",
    answer: `{ score: 2.7, confidence: 0.81 }`,
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <header className="flex flex-col gap-10">
        <Masthead right="runs on jev-1.13.0" />

        <div className="flex flex-col gap-6 pt-2 sm:pt-6">
          <a
            href="https://typesafe.ai"
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-2 rounded-full border-2 border-[var(--line)] py-1 pl-1 pr-3 text-[13px] font-semibold text-[var(--dim)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
          >
            <span className="rounded-full bg-[var(--v-fits)] px-2 py-0.5 text-[11px] font-extrabold uppercase text-[var(--on-color)]">
              new
            </span>
            Jev, the typed-judgment model from TypeSafe ↗
          </a>
          <h1 className="text-[3.6rem] font-extrabold leading-[0.92] tracking-[-0.04em] sm:text-[6.5rem]">
            Should I{" "}
            <span className="inline-block -rotate-2 rounded-2xl bg-[var(--accent)] px-3 text-[var(--accent-ink)]">Jev?</span>
          </h1>
          <p className="max-w-[56ch] text-lg leading-relaxed text-[var(--dim)] sm:text-xl">
            Jev doesn&apos;t write prose. You ask it a question and get back a{" "}
            <span className="font-bold text-[var(--text)]">typed answer with a probability</span>, so it
            sits between an <code className="font-mono text-[var(--text)]">if</code> and an LLM. Describe
            your feature and find out if it&apos;s a Jev job.
          </p>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-3" aria-label="What Jev returns">
          {PRIMITIVES.map((p) => (
            <li key={p.name} className="flex flex-col gap-3 rounded-2xl border-2 border-[var(--line-soft)] bg-[var(--bg-lift)] p-4">
              <span
                className="w-fit rounded-md px-2 py-0.5 text-[13px] font-extrabold text-[var(--on-color)]"
                style={{ background: p.color }}
              >
                {p.name}
              </span>
              <span className="text-[15px] font-medium leading-snug text-[var(--text)]">{p.asks}</span>
              <code className="mt-auto rounded-lg bg-[var(--bg)] px-3 py-2 font-mono text-[12.5px]" style={{ color: p.color }}>
                {p.answer}
              </code>
            </li>
          ))}
        </ul>
      </header>

      <Studio />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-extrabold tracking-tight">It will tell you when it&apos;s not a Jev job</h2>
          <p className="max-w-[62ch] text-[15px] text-[var(--dim)]">
            TypeSafe publishes what Jev is bad at: counting, dates, comparing numbers, multi-step
            reasoning, writing text. Every verdict checks your feature against that list, and
            &ldquo;just write code&rdquo; is the most common answer.
          </p>
        </div>
        <ol className="flex flex-wrap gap-2" aria-label="Every possible verdict, cheapest first">
          {LEGEND.map(({ kind, cost }) => (
            <li
              key={kind}
              className="flex items-baseline gap-2 rounded-xl px-3 py-2 text-[var(--on-color)]"
              style={{ background: VERDICT_COLOR[kind] }}
            >
              <span className="text-[15px] font-extrabold">{VERDICT_HEADLINES[kind]}</span>
              <span className="text-[12px] font-medium opacity-70">{cost}</span>
            </li>
          ))}
        </ol>
      </section>

      <MadeBy />
    </main>
  );
}
