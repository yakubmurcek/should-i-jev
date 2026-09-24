import { describe, expect, it } from "vitest";
import { composeVerdict } from "@/lib/compose";
import { QUESTIONS } from "@/lib/questions";
import { buildState } from "@/lib/state";
import { getVerdict, putVerdict } from "@/lib/store";
import type { VerdictRecord } from "@/lib/verdict";
import { FIXTURES } from "./fixtures";

describe("a stored verdict", () => {
  it("is rebuilt from its answers on read, so composition fixes reach old links", async () => {
    const f = FIXTURES.find((x) => x.expect === "use_an_llm")!;
    const fresh = composeVerdict(f.answers, "jev-1.13.0");
    // What an older composer might have stored for the same answers.
    const stale: VerdictRecord = {
      id: "stale0000000test",
      description: f.description,
      verdict: { ...fresh, kind: "just_write_code", headline: "Just write code" },
      work: { state: buildState(f.description), questions: QUESTIONS, answers: f.answers },
      createdAt: "2026-09-24T00:00:00.000Z",
    };
    await putVerdict(stale);
    const read = await getVerdict(stale.id);
    expect(read?.verdict.kind).toBe("use_an_llm");
  });
});
