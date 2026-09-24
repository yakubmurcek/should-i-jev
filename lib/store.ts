import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";
import { MODEL } from "@/lib/jev/client";
import { normalize } from "@/lib/state";
import { composeVerdict } from "@/lib/compose";
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
export function client(): Redis | null {
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
  __shouldIJevMemory?: Map<string, MemoryEntry>;
};
const memory = (globalMemory.__shouldIJevMemory ??= new Map<string, MemoryEntry>());

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
  const record = kv ? ((await kv.get<VerdictRecord>(key)) ?? null) : memGet<VerdictRecord>(key);
  return record && recompose(record);
}

/**
 * The cache holds Jev's answers, which cost an inference. The verdict on top of
 * them is local, deterministic logic, so it is rebuilt on every read: a fix to
 * composition reaches every shared link at once instead of waiting out the TTL.
 */
function recompose(record: VerdictRecord): VerdictRecord {
  try {
    return { ...record, verdict: composeVerdict(record.work.answers, record.verdict.modelVersion) };
  } catch {
    return record; // answers from an older question set: keep what was stored
  }
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

/**
 * §7 — rate limit by IP at the route. Fixed window, cheap and sufficient.
 *
 * Eight was too tight to actually try the tool: pasting a handful of ideas in
 * one sitting hit the wall on the ninth, which reads as broken rather than as
 * rate limiting. A cached verdict never reaches the limiter, so the budget is
 * spent only on genuinely new descriptions.
 */
export const RATE_LIMIT = { max: 25, windowSeconds: 60 * 10 };

export async function checkRateLimit(
  ip: string,
): Promise<{ ok: boolean; remaining: number; resetInSeconds: number }> {
  const windowMs = RATE_LIMIT.windowSeconds * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  // Fixed window, so the reset is the start of the next bucket. Telling the
  // visitor "a few minutes" when it is twenty seconds away loses them.
  const resetInSeconds = Math.ceil(((bucket + 1) * windowMs - Date.now()) / 1000);
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

  return {
    ok: count <= RATE_LIMIT.max,
    remaining: Math.max(0, RATE_LIMIT.max - count),
    resetInSeconds,
  };
}

/**
 * The spend ceiling. The per-IP limit stops one visitor; it does nothing
 * against many addresses, or small edits that dodge the cache. This counter is
 * global, so the worst day costs at most DAILY_CAP inferences no matter who is
 * calling. The account is prepaid ($5 monthly credit, no card), so the real
 * risk is an attacker draining it and taking the site down for the month. At
 * the measured ~1.4k input tokens per verdict, 1500 a day is ~$2.70 a month.
 */
export const DAILY_CAP = Number(process.env.DAILY_VERDICT_CAP) || 1500;

export async function checkDailyCap(): Promise<{ ok: boolean }> {
  const day = new Date().toISOString().slice(0, 10);
  const key = `daily:${day}`;
  const kv = client();

  let count: number;
  if (!kv) {
    count = (memGet<number>(key) ?? 0) + 1;
    memory.set(key, { value: count, expires: Date.now() + 60 * 60 * 26 * 1000 });
  } else {
    count = await kv.incr(key);
    if (count === 1) await kv.expire(key, 60 * 60 * 26);
  }
  return { ok: count <= DAILY_CAP };
}
