import { describe, expect, it } from "vitest";
import { MODEL, askJev } from "@/lib/jev/client";
import { QUESTIONS, QUESTION_IDS } from "@/lib/questions";
import { buildState } from "@/lib/state";
import { composeVerdict } from "@/lib/compose";

/**
 * §8 — a thin live smoke test covering the API CONTRACT only: one real request,
 * asserting the response shape and that every question id comes back.
 *
 * It deliberately does not assert which verdict comes out. Verdict behaviour is
 * tested offline against recorded answers, where it costs nothing; pinning a
 * model's judgment in a live test buys flakiness, not confidence.
 *
 *   npm run test:live   (needs TYPESAFE_API_KEY)
 */
const live = process.env.JEV_LIVE === "1" && !!process.env.TYPESAFE_API_KEY;

describe.skipIf(!live)("live contract", () => {
  it("answers every question in one request", async () => {
    const res = await askJev({
      state: buildState(
        "Every inbound support email has to land in one of nine queues based on what the customer is asking for.",
      ),
      questions: QUESTIONS,
    });

    expect(res.model).toBeTruthy();
    for (const id of QUESTION_IDS) {
      const a = res.answers[id];
      expect(a, `no answer for ${id}`).toBeDefined();
      if (a!.type === "noul") {
        expect(a).not.toHaveProperty("confidence"); // a Noul carries none
        expect((a as { noul: number }).noul).toBeGreaterThanOrEqual(0);
        expect((a as { noul: number }).noul).toBeLessThanOrEqual(1);
      } else {
        expect((a as { confidence: number }).confidence).toBeGreaterThanOrEqual(0);
      }
    }

    expect(() => composeVerdict(res.answers, res.model ?? MODEL)).not.toThrow();
  }, 60_000);
});
