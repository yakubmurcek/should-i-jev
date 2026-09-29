import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { OWNER_COOKIE, ownerToken, readStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stats", robots: { index: false, follow: false } };

/** Private usage page. Without the right ?key= it does not exist. */
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ key?: string; mine?: string }> }) {
  const { key, mine } = await searchParams;
  const includeMine = mine === "1";
  if (!process.env.STATS_KEY || key !== process.env.STATS_KEY) notFound();

  const stats = await readStats(includeMine);
  const marked = (await cookies()).get(OWNER_COOKIE)?.value === ownerToken();
  if (!stats) return <main className="p-6 font-mono">No KV configured, nothing is counted.</main>;

  const others = stats.recent.filter((r) => !r.mine);
  const mineCount = stats.recent.length - others.length;
  const shown = includeMine ? stats.recent : others;
  const toggleHref = `/stats?key=${encodeURIComponent(key)}${includeMine ? "" : "&mine=1"}`;

  const tiles: [string, number | undefined][] = [
    ["people who tried it", stats.triers],
    ["visitors", stats.visitors],
    ["page views", stats.total.view],
    ["new verdicts", stats.total.new],
    ["cached verdicts", stats.total.cached],
    ["rate limited", stats.total.limited],
    ["errors", stats.total.error],
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 font-mono text-sm">
      <h1 className="font-sans text-2xl font-bold">Usage</h1>
      <p className="opacity-60">
        Counters started {stats.days.at(-1)?.day ?? "today"}. Ideas below go back 30 days (verdict cache lifetime).
      </p>
      <a
        href={toggleHref}
        role="switch"
        aria-checked={includeMine}
        className="inline-flex items-center gap-3 rounded border border-current/30 px-3 py-2"
      >
        <span
          className={`relative h-5 w-9 rounded-full transition-colors ${includeMine ? "bg-current" : "bg-current/20"}`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${includeMine ? "left-[18px]" : "left-0.5"}`}
          />
        </span>
        Include my own use
      </a>
      {!marked && (
        <p className="rounded border border-current/40 p-3">
          This browser is not marked as yours, so its visits count as a stranger's.{" "}
          <a className="underline" href={`/api/owner?key=${encodeURIComponent(key)}`}>Mark this browser as mine</a>
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([label, n]) => (
          <div key={label} className="rounded border border-current/20 p-3">
            <div className="text-2xl font-bold">{n ?? 0}</div>
            <div className="opacity-60">{label}</div>
          </div>
        ))}
        <div className="rounded border border-current/20 p-3">
          <div className="text-2xl font-bold">{shown.length}</div>
          <div className="opacity-60">{includeMine ? "ideas judged (30d)" : "ideas from others (30d)"}</div>
        </div>
      </section>

      <section className="overflow-x-auto">
        <h2 className="mb-2 font-sans text-lg font-bold">By day (UTC)</h2>
        <table className="w-full text-left">
          <thead className="opacity-60">
            <tr><th>day</th><th>tried</th><th>visitors</th><th>views</th><th>new</th><th>cached</th><th>limited</th><th>errors</th></tr>
          </thead>
          <tbody>
            {stats.days.map((d) => (
              <tr key={d.day}>
                <td>{d.day}</td><td>{d.triers}</td><td>{d.visitors}</td><td>{d.counts.view ?? 0}</td>
                <td>{d.counts.new ?? 0}</td><td>{d.counts.cached ?? 0}</td><td>{d.counts.limited ?? 0}</td><td>{d.counts.error ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 font-sans text-lg font-bold">What people asked</h2>
        {!includeMine && <p className="mb-3 opacity-60">{mineCount} of yours hidden.</p>}
        {shown.length === 0 && <p>Nobody else yet.</p>}
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id}>
              <span className="opacity-60">{r.createdAt.slice(0, 16).replace("T", " ")} · {r.kind}{r.mine ? " · you" : ""}</span>{" "}
              <a className="underline" href={`/v/${r.id}`}>open</a>
              <div className="font-sans">{r.description}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
