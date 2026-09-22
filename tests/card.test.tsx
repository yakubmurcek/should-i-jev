import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import VerdictBanner from "@/components/VerdictBanner";
import VerdictDetails from "@/components/VerdictDetails";
import JudgmentGrid from "@/components/JudgmentGrid";
import { GROUPS, VERDICT_GIST } from "@/components/verdict-meta";
import { DefaultCardImage, OG_COLOR, VerdictCardImage, clamp } from "@/components/og";
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

describe("the share card", () => {
  it("renders for every fixture, including the ones that say no", () => {
    for (const f of FIXTURES) {
      const html = renderToStaticMarkup(<VerdictCardImage record={recordFor(f)} />);
      expect(html).toContain(recordFor(f).verdict.headline);
      // Real judgments on the card, not just the conclusion.
      expect(html).toContain("a rule covers it");
    }
  });

  it("falls back to the product card when a verdict has expired", () => {
    const html = renderToStaticMarkup(<DefaultCardImage />);
    expect(html).toContain("Does it fit Jev?");
  });

  it("gives every outcome its own colour, so a feed is legible", () => {
    expect(new Set(Object.values(OG_COLOR)).size).toBe(Object.keys(OG_COLOR).length);
  });

  it("paints the card in the colour of its own verdict", () => {
    for (const f of FIXTURES) {
      const record = recordFor(f);
      const html = renderToStaticMarkup(<VerdictCardImage record={record} />);
      expect(html).toContain(OG_COLOR[record.verdict.kind]);
    }
  });

  it("names a score against its whole scale, not the levels that kept mass", () => {
    // semantic_depth has four levels, and a confident answer leaves two of them
    // with no probability at all. Reading the scale off `probabilities` shrank
    // it, so a level-1 answer showed as "1 of 2" on a four-level question.
    const record = recordFor(FIXTURES.find((f) => f.id === "ml-high-volume-shallow")!);
    const html = renderToStaticMarkup(<VerdictCardImage record={record} />);
    expect(html).toContain("2 of 4");
    expect(html).not.toContain("1 of 2");
  });

  it("names every output shape short enough to survive its cell", () => {
    for (const f of FIXTURES) {
      const shape = f.answers.output_shape;
      if (shape?.type !== "choice") continue;
      const html = renderToStaticMarkup(<VerdictCardImage record={recordFor(f)} />);
      // A clipped reading ("action with...") is not a reading.
      expect(html).not.toContain("with...");
    }
  });

  it("cuts long text at a word boundary, never mid-word", () => {
    const text = "Flagged marketplace listings need a severity level assigned from the body";
    const cut = clamp(text, 40);
    expect(cut.endsWith("...")).toBe(true);
    // What survives is a whole-word prefix of the original.
    const kept = cut.slice(0, -3);
    expect(text.startsWith(kept)).toBe(true);
    expect(text[kept.length]).toBe(" ");
  });

  it("leaves text that already fits completely alone", () => {
    expect(clamp("short enough", 40)).toBe("short enough");
  });

  it("still cuts a single unbroken token rather than overflowing", () => {
    const cut = clamp("x".repeat(80), 20);
    expect(cut.length).toBeLessThanOrEqual(23);
    expect(cut.endsWith("...")).toBe(true);
  });
});
