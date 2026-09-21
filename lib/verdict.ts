import type { Answer } from "@/lib/jev/types";

export const VERDICTS = [
  "just_write_code",
  "jev_fits",
  "use_an_llm",
  "jev_plus_llm",
  "classical_ml",
  "not_enough_to_judge",
] as const;

export type VerdictKind = (typeof VERDICTS)[number];

export const VERDICT_HEADLINES: Record<VerdictKind, string> = {
  just_write_code: "Just write code",
  jev_fits: "Jev fits",
  use_an_llm: "Use an LLM",
  jev_plus_llm: "Jev + LLM",
  classical_ml: "Classical ML",
  not_enough_to_judge: "Not enough to judge",
};

/** One answer that composition actually consumed, with its certainty. */
export type DecidingJudgment = {
  id: string;
  /** Plain-language restatement of what was asked. */
  label: string;
  /** Plain-language restatement of the answer given. */
  reading: string;
  /**
   * The quantity the floor in §5.3 is applied to. For a Noul this is banded on
   * the returned probability (max(p, 1-p) — distance from "as likely as not");
   * for a Choice or Score it is the returned `confidence`. The two primitive
   * types are never compared on one scale.
   */
  certainty: number;
  /** How much this answer moved the verdict, for ranking. 1 = decided it outright. */
  weight: number;
};

export type Assumption = {
  id: string;
  /** The dimension the description left unstated. */
  dimension: string;
  /** What the tool filled in for it. */
  assumed: string;
};

/**
 * A missing half of the decision, offered to the visitor as something to fill
 * in. Vague descriptions are the normal case, not an error: the tool's job is
 * to show what it would need, not to refuse.
 */
export type Gap = {
  key: "input" | "output" | "basis";
  /** The question posed to the visitor. */
  ask: string;
  /** Tap-to-append starting points. */
  chips: string[];
};

export type Verdict = {
  kind: VerdictKind;
  headline: string;
  /** One-line why, composed by code from the answers that drove it. */
  why: string;
  /** Provisional when high_consequence fires and certainty sits in 0.6-0.85. */
  provisional: boolean;
  deciding: DecidingJudgment[];
  assumptions: Assumption[];
  /** The single detail most likely to flip the verdict. */
  whatWouldChangeThis: string;
  /** Jaggedness is version-specific, so the card names the model that judged it. */
  modelVersion: string;
  /** Composite Jev-fit score, present whenever composition reached step 3. */
  fitScore: number | null;
  /** What the description left out, when that is why we cannot rule. */
  gaps: Gap[];
  /** 0-1, how pinned down the description is. Drives the sharpen meter. */
  sharpness: number;
};

export type VerdictRecord = {
  id: string;
  description: string;
  verdict: Verdict;
  /** The credibility payload behind "Show your work". */
  work: {
    state: unknown;
    questions: unknown;
    answers: Record<string, Answer>;
  };
  createdAt: string;
};
