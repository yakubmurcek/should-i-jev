import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { MODEL } from "@/lib/jev/client";
import { normalize } from "@/lib/state";
import type { VerdictRecord } from "@/lib/verdict";

/**
 * §6 — the normalised description's hash is both the cache key and the
 * permalink id, so identical ideas cost one inference and every verdict is
 * shareable at /v/<hash>.
 *
 * The model version is part of the key: a version change invalidates cached
 * verdicts, because the vetoes are tied to that version's weaknesses.
 */
export function verdictId(description: string): string {
  return createHash("sha256")
    .update(`${MODEL}\u0000${normalize(description)}`)
    .digest("hex")
    .slice(0, 16);
}

const TTL_SECONDS = 60 * 60 * 24 * 30;

let redis: Redis | null | undefined;
function client(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

/**
 * Local dev without KV configured still works; it just forgets on restart.
 *
 * Hung off globalThis on purpose: Next gives route handlers and server
 * components separate module instances, so a plain module-scope Map means a
 * verdict written by POST /api/verdict is invisible to /v/<hash> and every
 * permalink 404s locally.
 */
type MemoryEntry = { value: unknown; expires: number };
const globalMemory = globalThis as typeof globalThis & {
  __jevFitMemory?: Map<string, MemoryEntry>;
};
const memory = (globalMemory.__jevFitMemory ??= new Map<string, MemoryEntry>());

function memGet<T>(key: string): T | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value as T;
}

export async function getVerdict(id: string): Promise<VerdictRecord | null> {
  const key = `verdict:${id}`;
  const kv = client();
  if (!kv) return memGet<VerdictRecord>(key);
  return (await kv.get<VerdictRecord>(key)) ?? null;
}

export async function putVerdict(record: VerdictRecord): Promise<void> {
  const key = `verdict:${record.id}`;
  const kv = client();
  if (!kv) {
    memory.set(key, { value: record, expires: Date.now() + TTL_SECONDS * 1000 });
    return;
  }
  await kv.set(key, record, { ex: TTL_SECONDS });
}

/** §7 — rate limit by IP at the route. Fixed window, cheap and sufficient. */
export const RATE_LIMIT = { max: 8, windowSeconds: 60 * 10 };

export async function checkRateLimit(
  ip: string,
): Promise<{ ok: boolean; remaining: number }> {
  const bucket = Math.floor(Date.now() / (RATE_LIMIT.windowSeconds * 1000));
  const key = `rl:${ip}:${bucket}`;
  const kv = client();

  let count: number;
  if (!kv) {
    count = (memGet<number>(key) ?? 0) + 1;
    memory.set(key, { value: count, expires: Date.now() + RATE_LIMIT.windowSeconds * 1000 });
  } else {
    count = await kv.incr(key);
    if (count === 1) await kv.expire(key, RATE_LIMIT.windowSeconds);
  }

  return { ok: count <= RATE_LIMIT.max, remaining: Math.max(0, RATE_LIMIT.max - count) };
}
