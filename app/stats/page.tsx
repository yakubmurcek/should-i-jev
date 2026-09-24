import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { readStats } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Stats", robots: { index: false, follow: false } };

/** Private usage page. Without the right ?key= it does not exist. */
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!process.env.STATS_KEY || key !== process.env.STATS_KEY) notFound();

  const stats = await readStats();
  if (!stats) return <main className="p-6 font-mono">No KV configured, nothing is counted.</main>;

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

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([label, n]) => (
          <div key={label} className="rounded border border-current/20 p-3">
            <div className="text-2xl font-bold">{n ?? 0}</div>
            <div className="opacity-60">{label}</div>
          </div>
        ))}
        <div className="rounded border border-current/20 p-3">
          <div className="text-2xl font-bold">{stats.recent.length}</div>
          <div className="opacity-60">ideas judged (30d)</div>
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
        <ul className="space-y-3">
          {stats.recent.map((r) => (
            <li key={r.id}>
              <span className="opacity-60">{r.createdAt.slice(0, 16).replace("T", " ")} · {r.kind}</span>{" "}
              <a className="underline" href={`/v/${r.id}`}>open</a>
              <div className="font-sans">{r.description}</div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
