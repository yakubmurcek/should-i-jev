import Studio from "@/components/Studio";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
      <header className="flex flex-col gap-4">
        <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Does it fit Jev?
        </h1>
        <p className="max-w-[54ch] text-lg leading-relaxed text-[var(--dim)] sm:text-xl">
          Jev returns typed judgments instead of prose, so it sits between an{" "}
          <code className="font-[family-name:var(--font-mono)] text-[var(--text)]">if</code> and an
          LLM. Describe a feature and watch it get ruled on.
        </p>
      </header>

      <Studio />

      <footer className="border-t border-[var(--line-soft)] pt-6 text-[13px] text-[var(--faint)]">
        It says no. &ldquo;Just write code&rdquo; is a real answer here, and the most common one.
      </footer>
    </main>
  );
}
