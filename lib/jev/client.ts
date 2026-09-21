import type { SystemOneRequest, SystemOneResponse } from "@/lib/jev/types";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

/**
 * Pinned, never an alias. The seven vetoes encode one version's jaggedness
 * profile, and `jev-latest` would shift that profile underneath them.
 */
export const MODEL = process.env.JEV_MODEL ?? "jev-1.13.0";

const RETRYABLE = new Set([429, 529]);
const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 400;

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

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));

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
      lastError = new JevError(`network failure calling Jev: ${String(cause)}`, 0, true);
      continue;
    }

    if (res.ok) return (await res.json()) as SystemOneResponse;

    const detail = (await res.text().catch(() => "")).slice(0, 400);
    const retryable = RETRYABLE.has(res.status) || res.status >= 500;
    lastError = new JevError(`Jev returned ${res.status}: ${detail}`, res.status, retryable);
    if (!retryable) throw lastError;
  }

  throw lastError ?? new JevError("Jev call failed", 0, true);
}
