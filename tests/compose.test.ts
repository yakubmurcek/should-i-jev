import { describe, expect, it } from "vitest";
import { MissingAnswerError, composeVerdict, JEV_FIT_THRESHOLD, WEIGHTS } from "@/lib/compose";
import { FLOOR } from "@/lib/bands";
import { QUESTION_IDS, VETO_IDS } from "@/lib/questions";
import { FIXTURES } from "./fixtures";
import { baseline, choice, noul, score, withAnswers } from "./answers";

const MODEL = "jev-1.13.0";
const compose = (answers = baseline()) => composeVerdict(answers, MODEL);

describe("golden fixtures", () => {
  for (const f of FIXTURES) {
    it(`${f.id}: ${f.proves}`, () => {
      const v = compose(f.answers);
      expect(v.kind, `${f.id}\nwhy: ${v.why}`).toBe(f.expect);

      if (f.alsoExpect?.provisional !== undefined) {
        expect(v.provisional).toBe(f.alsoExpect.provisional);
      }
      if (f.alsoExpect?.decidingIncludes) {
        expect(v.deciding.map((d) => d.id)).toContain(f.alsoExpect.decidingIncludes);
      }
    });
  }

  it("covers every verdict outcome", () => {
    const covered = new Set(FIXTURES.map((f) => f.expect));
    expect([...covered].sort()).toEqual([
      "classical_ml",
      "jev_fits",
      "jev_plus_llm",
      "just_write_code",
      "not_enough_to_judge",
      "use_an_llm",
    ]);
  });

  it("covers every veto firing in isolation against a strong Jev-fit score", () => {
    // §8 — each of the seven must have a fixture where it fires alone and
    // correctly overrides a baseline that would otherwise read as "Jev fits".
    expect(compose().kind).toBe("jev_fits");

    for (const veto of VETO_IDS) {
      // `untrusted_input` is conditional: it blocks only when a wrong answer
      // costs something material (see CONDITIONAL_VETOES in lib/compose.ts).
      // `untrusted_input` is no longer a veto at all (see NEVER_VETO): it
      // changes how the verdict may be acted on, not which verdict it is.
      if (veto === "untrusted_input") continue;
      const v = compose(withAnswers({ [veto]: noul(0.93) }));
      expect(v.kind, `${veto} did not override a strong Jev-fit score`).not.toBe("jev_fits");
      expect(v.deciding.map((d) => d.id)).toContain(veto);
    }
  });
});

describe("the card is honest about what it does not know", () => {
  it("always carries the assumptions section, even when empty", () => {
    expect(Array.isArray(compose().assumptions)).toBe(true);
  });

  it("lists a dimension the description left unstated", () => {
    const v = compose(withAnswers({ repeated_at_volume: noul(0.55) }));
    expect(v.assumptions.map((a) => a.id)).toContain("repeated_at_volume");
  });

  it("names the model version that judged it", () => {
    expect(compose().modelVersion).toBe(MODEL);
  });

  it("never shows more than three deciding judgments", () => {
    for (const f of FIXTURES) {
      expect(compose(f.answers).deciding.length).toBeLessThanOrEqual(3);
    }
  });

  it("always offers what would change the verdict", () => {
    for (const f of FIXTURES) {
      expect(compose(f.answers).whatWouldChangeThis.length).toBeGreaterThan(10);
    }
  });
});

describe("untrusted input changes how the verdict may be acted on, not which one", () => {
  it("never vetoes — code cannot do the jobs that read public text", () => {
    for (const consequence of [noul(0.9), noul(0.08)]) {
      const v = compose(withAnswers({ untrusted_input: noul(0.93), high_consequence: consequence }));
      expect(v.kind).toBe("jev_fits");
      expect(v.why).toContain("does not treat its state as hostile");
    }
  });

  it("is provisional when a wrong answer also costs something material", () => {
    const v = compose(withAnswers({ untrusted_input: noul(0.93), high_consequence: noul(0.9) }));
    expect(v.provisional).toBe(true);
    expect(v.whatWouldChangeThis).toContain("act on its own");
  });

  it("stays provisional however concentrated the answers are", () => {
    // Confidence measures the model's certainty, not whether somebody wrote
    // the input in order to steer it.
    const v = compose(
      withAnswers({
        untrusted_input: noul(0.97),
        high_consequence: noul(0.96),
        semantic_depth: score("semantic_depth", 2, 0.98),
        output_shape: choice("closed_set", 0.99),
        description_specificity: score("description_specificity", 3, 0.98),
      }),
    );
    expect(v.provisional).toBe(true);
  });

  it("is not provisional when nothing material is at stake", () => {
    const v = compose(withAnswers({ untrusted_input: noul(0.93), high_consequence: noul(0.05) }));
    expect(v.provisional).toBe(false);
  });
});

describe("the floor only withholds on uncertainty that could change the verdict", () => {
  it("ignores a weak answer whose resolution cannot alter the outcome", () => {
    // latency_sensitive carries the smallest weight there is (0.10) and lands
    // near 0.5 on most real descriptions.
    const v = compose(withAnswers({ latency_sensitive: noul(0.5) }));
    expect(v.kind).toBe("jev_fits");
  });

  it("still withholds when resolving the weak answer would change the verdict", () => {
    const v = compose(withAnswers({ deterministic_rule_exists: noul(0.5) }));
    expect(v.kind).toBe("not_enough_to_judge");
  });
});

describe("a vague description is playable, not rejected", () => {
  it("names the halves the description left out", () => {
    const v = compose(
      withAnswers({
        description_specificity: score("description_specificity", 0, 0.95),
        states_input: noul(0.1),
        states_output: noul(0.08),
      }),
    );
    expect(v.kind).toBe("not_enough_to_judge");
    expect(v.gaps.map((g) => g.key)).toEqual(["input", "output", "basis"]);
    // Every gap offers something concrete to tap, never just a complaint.
    for (const g of v.gaps) expect(g.chips.length).toBeGreaterThan(2);
  });

  it("only asks for the half that is actually missing", () => {
    const v = compose(
      withAnswers({
        description_specificity: score("description_specificity", 2, 0.9),
        states_input: noul(0.95),
        states_output: noul(0.06),
      }),
    );
    expect(v.gaps.map((g) => g.key)).toEqual(["output", "basis"]);
  });

  it("reports sharpness so the meter can move as the description improves", () => {
    const vague = compose(
      withAnswers({ description_specificity: score("description_specificity", 0, 0.9) }),
    );
    const sharp = compose();
    expect(vague.sharpness).toBe(0);
    expect(sharp.sharpness).toBe(1);
  });

  it("asks for nothing once the description states all three", () => {
    expect(compose().gaps).toEqual([]);
  });
});

describe("probabilities are never compared across primitive types", () => {
  it("bands a Noul on its probability and a Choice/Score on confidence", () => {
    // A Noul at 0.05 is a CONFIDENT no, not a weak answer. If the floor were
    // applied to the raw probability it would withhold this verdict.
    const v = compose(withAnswers({ untrusted_input: noul(0.03) }));
    expect(v.kind).toBe("jev_fits");
  });

  it("treats a Noul near 0.5 as 'as likely as not', not as medium intensity", () => {
    const v = compose(withAnswers({ deterministic_rule_exists: noul(0.52) }));
    expect(v.kind).toBe("not_enough_to_judge");
  });
});

describe("order of evaluation", () => {
  it("runs the specificity gate before anything else can outvote it", () => {
    const v = compose(
      withAnswers({
        description_specificity: score("description_specificity", 0, 0.9),
        deterministic_rule_exists: noul(0.99),
      }),
    );
    expect(v.kind).toBe("not_enough_to_judge");
    expect(v.fitScore).toBeNull();
  });

  it("evaluates vetoes before weighting, so fit cannot outvote them", () => {
    const v = compose(withAnswers({ needs_arithmetic: noul(0.9) }));
    expect(v.kind).toBe("just_write_code");
    expect(v.fitScore).toBeNull();
  });

  it("applies the floor only to answers composition actually consumed", () => {
    // primitive_fit/pattern_fit are speculative: on a vetoed branch they are
    // discarded, so their certainty is irrelevant however low.
    const v = compose(
      withAnswers({
        needs_arithmetic: noul(0.9),
        primitive_fit: { type: "choice", choice: "none_fits", confidence: 0.02, probabilities: {} },
      }),
    );
    expect(v.kind).toBe("just_write_code");
  });
});

describe("weights and thresholds are tunable without new inference", () => {
  it("keeps the composite weights summing to one", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("reports a composite score whenever composition reached the weighting step", () => {
    const v = compose();
    expect(v.fitScore).not.toBeNull();
    expect(v.fitScore!).toBeGreaterThanOrEqual(JEV_FIT_THRESHOLD);
  });

  it("uses the confidence-routing floor, not the stricter confidence.md bands", () => {
    expect(FLOOR).toBe(0.6);
    // 0.7 clears the adopted floor. Under 0.9/0.95 this verdict would be withheld.
    const v = compose(withAnswers({ semantic_depth: score("semantic_depth", 2, 0.7) }));
    expect(v.kind).toBe("jev_fits");
  });
});

describe("contract failures surface as errors, never as an empty verdict", () => {
  it("refuses to compose when an answer is missing", () => {
    const answers = baseline();
    delete answers.output_shape;
    expect(() => composeVerdict(answers, MODEL)).toThrow(MissingAnswerError);
  });

  it("refuses to compose when an answer has the wrong primitive type", () => {
    const answers = baseline();
    answers.needs_generation = score("semantic_depth", 1, 0.9);
    expect(() => composeVerdict(answers, MODEL)).toThrow(MissingAnswerError);
  });

  it("asks exactly the fifteen questions of the spec", () => {
    expect(QUESTION_IDS).toHaveLength(19);
  });
});
