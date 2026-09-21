import type { SystemOneRequest, SystemOneResponse } from "@/lib/jev/types";

/** Overridable so an outage can be reproduced against a local stub. */
const ENDPOINT = process.env.JEV_ENDPOINT ?? "https://api.typesafe.ai/v1/systemone";

/**
 * Pinned, never an alias. The seven vetoes encode one version's jaggedness
 * profile, and `jev-latest` would shift that profile underneath them.
 */
export const MODEL = process.env.JEV_MODEL ?? "jev-1.13.0";

const RETRYABLE = new Set([429, 529]);
/**
 * 529 is TypeSafe telling us it is overloaded, and an overload lasts longer
 * than a couple of seconds. The old budget gave up after 2.8s total, which
 * surfaced a transient upstream blip to the visitor as a failed verdict.
 *
 * Full jitter on the delay, because every client retrying on the same curve is
 * how an overloaded service stays overloaded.
 */
const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 600;
const MAX_DELAY_MS = 8_000;

function backoffMs(attempt: number): number {
  const ceiling = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  return Math.round(ceiling * (0.5 + Math.random() * 0.5));
}

/** Honour the server's own pacing when it gives one. */
function retryAfterMs(res: Response): number | null {
  const raw = res.headers.get("retry-after");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000);
  const at = Date.parse(raw);
  return Number.isNaN(at) ? null : Math.min(Math.max(at - Date.now(), 0), 30_000);
}

/** 401 and 422 will not fix themselves; they must surface, never become an empty verdict. */
export class JevError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "JevError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function askJev(
  req: Omit<SystemOneRequest, "model"> & { model?: string },
  opts: { apiKey?: string; signal?: AbortSignal } = {},
): Promise<SystemOneResponse> {
  const apiKey = opts.apiKey ?? process.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new JevError("TYPESAFE_API_KEY is not set", 0, false);

  const body = JSON.stringify({ model: MODEL, ...req });
  let lastError: JevError | null = null;

  let wait = 0;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(wait || backoffMs(attempt));

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: opts.signal,
      });
    } catch (cause) {
      wait = 0;
      lastError = new JevError(`network failure calling Jev: ${String(cause)}`, 0, true);
      continue;
    }

    if (res.ok) return (await res.json()) as SystemOneResponse;

    const detail = (await res.text().catch(() => "")).slice(0, 400);
    const retryable = RETRYABLE.has(res.status) || res.status >= 500;
    wait = (retryable && retryAfterMs(res)) || 0;
    lastError = new JevError(`Jev returned ${res.status}: ${detail}`, res.status, retryable);
    if (!retryable) throw lastError;
  }

  throw lastError ?? new JevError("Jev call failed", 0, true);
}
