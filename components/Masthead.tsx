import Link from "next/link";

/** The top bar on every page: the name as a sticker, one fact on the right. */
export default function Masthead({ right }: { right?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        href="/"
        className="-rotate-2 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[15px] font-extrabold tracking-tight text-[var(--accent-ink)] transition hover:rotate-0"
      >
        should i jev?
      </Link>
      {right && <span className="hidden font-mono text-[12px] text-[var(--faint)] sm:inline">{right}</span>}
    </div>
  );
}
