import DescribeForm from "@/components/DescribeForm";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col gap-10">
      <header className="flex flex-col gap-4">
        <div className="text-xs font-mono uppercase tracking-widest text-[var(--text-faint)]">
          jev-fit
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Does your feature fit Jev?
        </h1>
        <div className="flex flex-col gap-3 text-base leading-relaxed text-[var(--text-dim)]">
          <p>
            Jev is TypeSafe&apos;s typed-judgment model: instead of writing prose, it
            returns a chosen option, a calibrated probability, or a score on a
            scale you define — so it sits between an <code className="font-mono text-[var(--text)]">if</code>{" "}
            statement and an LLM.
          </p>
          <p>
            Describe a feature below and this tool runs it through the same
            questions TypeSafe documents as Jev&apos;s strengths and weaknesses,
            then composes a verdict in code — not by asking Jev to grade itself.
          </p>
          <p>
            It is willing to say no. &ldquo;Just write code&rdquo; and &ldquo;not
            enough to judge&rdquo; are correct outcomes here, not failures of the
            tool.
          </p>
        </div>
      </header>

      <DescribeForm />
    </main>
  );
}
