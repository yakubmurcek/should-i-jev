import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VerdictCard from "@/components/VerdictCard";
import { composeVerdict } from "@/lib/compose";
import { QUESTIONS } from "@/lib/questions";
import { buildState } from "@/lib/state";
import type { VerdictRecord } from "@/lib/verdict";
import { FIXTURES } from "./fixtures";

/**
 * The card is the product surface, so every fixture must actually render — and
 * must carry the sections the spec calls mandatory, including on the verdicts
 * that say no.
 */
const recordFor = (f: (typeof FIXTURES)[number]): VerdictRecord => ({
  id: f.id,
  description: f.description,
  verdict: composeVerdict(f.answers, "jev-1.13.0"),
  work: { state: buildState(f.description), questions: QUESTIONS, answers: f.answers },
  createdAt: "2026-09-21T00:00:00.000Z",
});

describe("verdict card", () => {
  for (const f of FIXTURES) {
    it(`renders ${f.id}`, () => {
      const record = recordFor(f);
      const html = renderToStaticMarkup(<VerdictCard record={record} />);

      expect(html).toContain(record.verdict.headline);
      // Mandatory sections (§3): assumptions, what would change this, model
      // version, and the show-your-work payload.
      expect(html.toLowerCase()).toContain("assum");
      expect(html).toContain(record.verdict.modelVersion);
      expect(html).toContain("needs_generation"); // the work panel is complete
      expect(html.length).toBeGreaterThan(500);
    });
  }

  it("never presents a withheld verdict as an error", () => {
    const f = FIXTURES.find((x) => x.expect === "not_enough_to_judge")!;
    const html = renderToStaticMarkup(<VerdictCard record={recordFor(f)} />);
    expect(html).toContain("Not enough to judge");
    expect(html.toLowerCase()).not.toContain("something went wrong");
  });
});
