import { GithubLogo, XLogo } from "@phosphor-icons/react/dist/ssr";

/** Who built it, and where to follow along. Same block on every page. */
export default function MadeBy() {
  return (
    <footer className="flex flex-col gap-5 rounded-2xl border-2 border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://github.com/yakubmurcek.png?size=96"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full border-2 border-[var(--accent)]"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-[17px] font-bold">
            Built by Yakub Murcek
          </p>
          <p className="text-[14px] text-[var(--dim)]">
            Building SaaS in public. Every verdict links to its full working.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="https://x.com/ykbmck"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl bg-[var(--text)] px-4 py-2.5 text-[14px] font-bold text-[var(--bg)] shadow-[3px_3px_0_var(--accent)] transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
        >
          <XLogo size={15} weight="fill" />
          Follow @ykbmck
        </a>
        <a
          href="https://github.com/yakubmurcek/should-i-jev"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border-2 border-[var(--line)] px-4 py-2 text-[14px] font-semibold text-[var(--dim)] transition hover:border-[var(--text)] hover:text-[var(--text)]"
        >
          <GithubLogo size={15} weight="fill" />
          Source
        </a>
      </div>
    </footer>
  );
}
