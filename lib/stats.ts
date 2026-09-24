import { createHash } from "node:crypto";
import { client } from "@/lib/store";
import type { VerdictRecord } from "@/lib/verdict";

/**
 * Usage counters. Kept apart from the spend cap on purpose: those keys expire
 * after a day, these never do, so "how many people tried it" survives.
 *
 * view    a page opened in a browser (bots rarely run the beacon)
 * new     a fresh verdict, one Jev inference
 * cached  a verdict served from cache, someone repeating a known idea
 * limited turned away by the per-IP or daily cap
 * error   Jev failed or answered badly
 */
export type StatEvent = "view" | "new" | "cached" | "limited" | "error";
export const STAT_EVENTS: StatEvent[] = ["view", "new", "cached", "limited", "error"];

const day = () => new Date().toISOString().slice(0, 10);

// Only a hash of the address is kept; it is enough to count distinct visitors.
const visitor = (ip: string) => createHash("sha256").update(`should-i-jev:${ip}`).digest("hex").slice(0, 16);

/** Never throws: a counter must not take a verdict down with it. */
export async function track(event: StatEvent, ip: string): Promise<void> {
  const kv = client();
  if (!kv) return;
  const d = day();
  const v = visitor(ip);
  try {
    const p = kv.pipeline();
    p.hincrby(`stats:day:${d}`, event, 1);
    p.hincrby("stats:total", event, 1);
    p.pfadd(`stats:visitors:${d}`, v);
    p.pfadd("stats:visitors:all", v);
    if (event === "new" || event === "cached") {
      p.pfadd(`stats:triers:${d}`, v);
      p.pfadd("stats:triers:all", v);
    }
    await p.exec();
  } catch (err) {
    console.warn("[stats] track failed", err);
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

type Counts = Partial<Record<StatEvent, number>>;
export type DayRow = { day: string; counts: Counts; visitors: number; triers: number };
export type Stats = {
  total: Counts;
  visitors: number;
  triers: number;
  days: DayRow[];
  recent: { id: string; description: string; createdAt: string; kind?: string }[];
};

const toCounts = (h: Record<string, unknown> | null): Counts =>
  Object.fromEntries(Object.entries(h ?? {}).map(([k, v]) => [k, Number(v)]));

export async function readStats(days = 30): Promise<Stats | null> {
  const kv = client();
  if (!kv) return null;

  const dates = Array.from({ length: days }, (_, i) =>
    new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10),
  );

  const [total, visitors, triers, ...rows] = await Promise.all([
    kv.hgetall<Record<string, unknown>>("stats:total"),
    kv.pfcount("stats:visitors:all"),
    kv.pfcount("stats:triers:all"),
    ...dates.map(async (d) => ({
      day: d,
      counts: toCounts(await kv.hgetall<Record<string, unknown>>(`stats:day:${d}`)),
      visitors: await kv.pfcount(`stats:visitors:${d}`),
      triers: await kv.pfcount(`stats:triers:${d}`),
    })),
  ]);

  // Every idea anyone judged in the last 30 days (the verdict TTL): what people actually ask.
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await kv.scan(cursor, { match: "verdict:*", count: 1000 });
    cursor = String(next);
    keys.push(...batch);
  } while (cursor !== "0");
  const records = keys.length ? await kv.mget<(VerdictRecord | null)[]>(...keys) : [];
  const recent = records
    .filter((r): r is VerdictRecord => !!r)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({ id: r.id, description: r.description, createdAt: r.createdAt, kind: r.verdict?.kind }));

  return {
    total: toCounts(total),
    visitors,
    triers,
    days: (rows as DayRow[]).filter((r) => Object.keys(r.counts).length > 0),
    recent,
  };
}
