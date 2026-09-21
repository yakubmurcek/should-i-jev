import { QUESTIONS } from "@/lib/questions";
import type { Answer, ScoreQuestion } from "@/lib/jev/types";

/** Builders for fixture answers, matching the wire shapes in lib/jev/types.ts. */

export const noul = (p: number): Answer => ({ type: "noul", noul: p });

export const choice = (
  key: string,
  confidence: number,
  rest: Record<string, number> = {},
): Answer => ({
  type: "choice",
  choice: key,
  confidence,
  probabilities: { [key]: confidence, ...rest },
});

export const score = (questionId: string, level: number, confidence: number): Answer => {
  const q = QUESTIONS[questionId] as ScoreQuestion;
  const legend = Object.fromEntries(q.criteria.map((text, i) => [String(i), text]));
  // A real Score answer spreads its remaining mass over neighbouring levels.
  // Emitting a single key would leave the materiality probe in lib/compose.ts
  // with no alternative level to explore.
  const lvl = Math.round(level);
  const neighbours = [lvl - 1, lvl + 1].filter((i) => i >= 0 && i < q.criteria.length);
  const each = neighbours.length ? (1 - confidence) / neighbours.length : 0;
  const probabilities: Record<string, number> = { [String(lvl)]: confidence };
  for (const n of neighbours) probabilities[String(n)] = each;

  return { type: "score", score: level, legend, probabilities, confidence };
};

/**
 * A confidently Jev-shaped answer set: no veto fires, deep-ish semantics, a
 * closed-set output, high volume, interactive path, well-specified.
 *
 * Every fixture starts here and overrides only the dimensions it is about, so a
 * veto fixture proves the veto overrode an otherwise strong Jev-fit score
 * rather than merely coinciding with a weak one.
 */
export function baseline(): Record<string, Answer> {
  return {
    needs_generation: noul(0.04),
    needs_arithmetic: noul(0.05),
    needs_temporal_reasoning: noul(0.05),
    needs_numeric_comparison: noul(0.06),
    needs_multihop_reasoning: noul(0.09),
    needs_external_lookup: noul(0.12),
    untrusted_input: noul(0.08),
    deterministic_rule_exists: noul(0.07),
    output_shape: choice("closed_set", 0.93, { structured_record: 0.05 }),
    repeated_at_volume: noul(0.95),
    labelled_outcomes_exist: noul(0.1),
    latency_sensitive: noul(0.88),
    high_consequence: noul(0.12),
    semantic_depth: score("semantic_depth", 2, 0.87),
    description_specificity: score("description_specificity", 3, 0.9),
    states_input: noul(0.93),
    states_output: noul(0.92),
    primitive_fit: choice("choice", 0.9),
    pattern_fit: choice("intent_routing", 0.84),
  };
}

export function withAnswers(
  overrides: Record<string, Answer>,
): Record<string, Answer> {
  return { ...baseline(), ...overrides };
}
