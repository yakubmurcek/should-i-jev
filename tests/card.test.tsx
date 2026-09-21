import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VerdictBanner from "@/components/VerdictBanner";
import VerdictDetails from "@/components/VerdictDetails";
import JudgmentGrid from "@/components/JudgmentGrid";
import { GROUPS, VERDICT_GIST } from "@/components/verdict-meta";
import { composeVerdict } from "@/lib/compose";
import { QUESTIONS, QUESTION_IDS } from "@/lib/questions";
import { buildState } from "@/lib/state";
import type { VerdictRecord } from "@/lib/verdict";
import { FIXTURES } from "./fixtures";

const recordFor = (f: (typeof FIXTURES)[number]): VerdictRecord => ({
  id: f.id,
  description: f.description,
  verdict: composeVerdict(f.answers, "jev-1.13.0"),
  work: { state: buildState(f.description), questions: QUESTIONS, answers: f.answers },
  createdAt: "2026-09-21T00:00:00.000Z",
});

describe("the verdict is readable at a glance", () => {
  for (const f of FIXTURES) {
    it(`renders ${f.id}`, () => {
      const record = recordFor(f);
      const html =
        renderToStaticMarkup(<VerdictBanner verdict={record.verdict} />) +
        renderToStaticMarkup(<JudgmentGrid answers={record.work.answers} />) +
        renderToStaticMarkup(<VerdictDetails record={record} />);

      // The headline and its one-line read carry the answer on their own.
      expect(html).toContain(record.verdict.headline);
      expect(html).toContain(VERDICT_GIST[record.verdict.kind]);
      // The detail is reachable but folded: the panels are closed on arrival,
      // so what must be present up front is the way in, not the contents.
      for (const panel of ["Why, in full", "What decided it", "What it assumed", "Show your work"]) {
        expect(html).toContain(panel);
      }
      // The grid itself is never folded: every judgment is visible immediately.
      expect(html).toContain("takes dependent steps");
    });
  }

  it("marks a provisional verdict without burying it in prose", () => {
    const f = FIXTURES.find((x) => x.alsoExpect?.provisional === true)!;
    const html = renderToStaticMarkup(<VerdictBanner verdict={recordFor(f).verdict} />);
    expect(html).toContain("Provisional");
  });

  it("never presents a withheld verdict as an error", () => {
    const f = FIXTURES.find((x) => x.expect === "not_enough_to_judge")!;
    const html = renderToStaticMarkup(<VerdictBanner verdict={recordFor(f).verdict} />);
    expect(html).toContain("Not enough to judge");
    expect(html.toLowerCase()).not.toContain("something went wrong");
  });
});

describe("the judgment grid shows every question", () => {
  it("covers all nineteen, with none left out of a group", () => {
    const grouped = GROUPS.flatMap((g) => g.ids);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual([...QUESTION_IDS].sort());
  });
});
