import Link from "next/link";

/** The running head on every page, set like a printed report. */
export default function Masthead({ right }: { right?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--text)] pb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--dim)]">
      <Link href="/" className="text-[var(--text)] transition hover:text-[var(--accent)]">
        Should I Jev?
      </Link>
      {right && <span className="hidden sm:inline">{right}</span>}
    </div>
  );
}
