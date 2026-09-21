import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JevError, askJev } from "@/lib/jev/client";

/**
 * TypeSafe returns 529 under load. That is a wait, not a failed verdict, and it
 * reached a visitor once as a raw error, so the retry behaviour is pinned here.
 */
const ok = () =>
  new Response(JSON.stringify({ model: "jev-1.13.0", answers: {} }), { status: 200 });

const busy = (headers?: Record<string, string>) =>
  new Response(
    JSON.stringify({ detail: { error_type: "system_overloaded", message: "high traffic" } }),
    { status: 529, headers },
  );

// The backoff is real seconds in production. Fake timers let the tests assert
// the actual budget without spending it.
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Runs a call to completion, advancing past every scheduled backoff. */
async function settle<T>(promise: Promise<T>): Promise<T> {
  const done = promise.then(
    (v) => ({ ok: true as const, v }),
    (e) => ({ ok: false as const, e }),
  );
  for (let i = 0; i < 12; i++) {
    await vi.advanceTimersByTimeAsync(10_000);
  }
  const r = await done;
  if (r.ok) return r.v;
  throw r.e;
}

function stubFetch(responses: (() => Response)[]) {
  const calls: number[] = [];
  const fetchMock = vi.fn(async () => {
    calls.push(Date.now());
    const next = responses.shift();
    if (!next) throw new Error("fetch called more times than the test allows");
    return next();
  });
  vi.stubGlobal("fetch", fetchMock);
  return { fetchMock, calls };
}

const call = () => askJev({ state: {}, questions: {} }, { apiKey: "test-key" });

describe("a busy upstream", () => {
  it("retries a 529 and succeeds once the service recovers", async () => {
    const { fetchMock } = stubFetch([busy, busy, ok]);
    const res = await settle(call());
    expect(res.model).toBe("jev-1.13.0");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("spends a real budget before giving up, not a couple of seconds", async () => {
    const { fetchMock } = stubFetch(Array.from({ length: 6 }, () => busy));
    const started = Date.now();
    await expect(settle(call())).rejects.toBeInstanceOf(JevError);
    // Five jittered sleeps, each at least half its ceiling: 300+600+1200+2400+4000.
    expect(Date.now() - started).toBeGreaterThan(4000);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("honours Retry-After when the server sets one", async () => {
    stubFetch([() => busy({ "retry-after": "3" }), ok]);
    const started = Date.now();
    await settle(call());
    // 3s beats the ~600ms the backoff curve would have chosen on its own.
    expect(Date.now() - started).toBeGreaterThanOrEqual(3000);
  });

  it("marks the failure retryable so the route can say 'busy' rather than 'broken'", async () => {
    stubFetch(Array.from({ length: 6 }, () => busy));
    expect.assertions(2);
    await settle(call()).catch((err: JevError) => {
      expect(err.retryable).toBe(true);
      expect(err.status).toBe(529);
    });
  });
});

describe("a terminal failure", () => {
  it("does not retry a 401, because it will not fix itself", async () => {
    const { fetchMock } = stubFetch([
      () => new Response("unauthorized", { status: 401 }),
    ]);
    await expect(settle(call())).rejects.toMatchObject({ status: 401, retryable: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 422", async () => {
    const { fetchMock } = stubFetch([() => new Response("bad question", { status: 422 })]);
    await expect(settle(call())).rejects.toMatchObject({ status: 422, retryable: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails immediately with no key rather than calling out", async () => {
    const { fetchMock } = stubFetch([ok]);
    await expect(settle(askJev({ state: {}, questions: {} }, { apiKey: "" }))).rejects.toBeInstanceOf(
      JevError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
