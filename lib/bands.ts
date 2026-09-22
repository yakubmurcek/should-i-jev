import type { Answer, ChoiceAnswer, NoulAnswer, ScoreAnswer } from "@/lib/jev/types";

/**
 * §5.1 — Noul and Choice probabilities are not on one scale, and even
 * "P(noul) and 1 - P(not noul) may not be directly comparable". So raw
 * probabilities are never summed across primitive types. Every answer is first
 * banded here, and only bands and Score levels reach the weighting in
 * lib/compose.ts.
 *
 * The two primitive types are banded by DIFFERENT quantities:
 *   Noul          -> the returned probability (it has no `confidence` field;
 *                    its probability IS the signal, and ~0.5 means "as likely
 *                    yes as no", not "medium intensity").
 *   Choice / Score -> `confidence`, which summarises distribution concentration.
 */

/** §5.3 — the bands of patterns/confidence-routing, adopted deliberately. */
export const FLOOR = 0.6;
export const HIGH_CONSEQUENCE_ACT = 0.85;
/** Below this an answer is reported as an assumption rather than a finding. */
export const ASSUMED_BELOW = 0.8;

/**
 * The mass an option or level needs before the materiality probe treats it as a
 * way this answer could really have resolved.
 *
 * Jev spreads a little mass over options it has all but ruled out. On a real
 * "is this message angry enough to escalate?" the shape came back
 * `action_with_parameters` 0.60, `closed_set` 0.38, `unclear` 0.01 — and
 * probing `unclear` flipped the verdict, so the floor withheld a ruling that
 * 98 % of the mass agreed on. A one-in-a-hundred option is not an alternative
 * reading of the description, it is rounding.
 */
export const PLAUSIBLE_MASS = 0.1;

export type NoulBand = "fires" | "uncertain" | "does_not_fire";

/**
 * A Noul is definite in either direction once it clears the floor; the floor is
 * applied symmetrically because 0.05 is a confident "no", not a weak answer.
 */
export function bandNoul(p: number): NoulBand {
  if (p >= FLOOR) return "fires";
  if (p <= 1 - FLOOR) return "does_not_fire";
  return "uncertain";
}

/** How far a Noul sits from "as likely yes as no". Comparable to a confidence. */
export function noulCertainty(p: number): number {
  return Math.max(p, 1 - p);
}

/**
 * A Score's levels are ORDERED; a Choice's options are not. Probability split
 * between two NEIGHBOURING levels means "between these two" — that is
 * precision, not ignorance — while mass two levels away is genuine confusion.
 * So a Score's certainty is the mass within one level of where it landed.
 *
 * Measured: the canonical support-routing case returns semantic_depth 2.2 at
 * confidence 0.46. Read as a Choice confidence that is below the floor and the
 * verdict is withheld; read as an ordered scale it says "between reading in
 * context and domain judgment", which is a clear answer for our purposes —
 * both levels weigh the same way in the composite.
 */
export function scoreCertainty(answer: ScoreAnswer): number {
  const level = scoreLevel(answer);
  let mass = 0;
  for (const [k, p] of Object.entries(answer.probabilities)) {
    if (Math.abs(Number(k) - level) <= 1) mass += p;
  }
  // Fall back to the reported confidence if probabilities are absent.
  return mass > 0 ? Math.min(1, mass) : answer.confidence;
}

/** The quantity the §5.3 floor applies to, per primitive type. */
export function certaintyOf(answer: Answer): number {
  if (answer.type === "noul") return noulCertainty(answer.noul);
  if (answer.type === "score") return scoreCertainty(answer);
  return answer.confidence;
}

/** The level a continuous Score sits at. Index 0 is the lowest level. */
export function scoreLevel(answer: ScoreAnswer): number {
  return Math.round(answer.score);
}

export function isNoul(a: Answer | undefined): a is NoulAnswer {
  return a?.type === "noul";
}
export function isChoice(a: Answer | undefined): a is ChoiceAnswer {
  return a?.type === "choice";
}
export function isScore(a: Answer | undefined): a is ScoreAnswer {
  return a?.type === "score";
}
