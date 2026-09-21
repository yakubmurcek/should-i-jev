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

/** The quantity the §5.3 floor applies to, per primitive type. */
export function certaintyOf(answer: Answer): number {
  if (answer.type === "noul") return noulCertainty(answer.noul);
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
