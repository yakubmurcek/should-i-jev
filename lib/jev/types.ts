/**
 * Wire types for POST https://api.typesafe.ai/v1/systemone
 * Shapes verified against https://docs.typesafe.ai/api.md (2026-09-20).
 */

/** Criteria values may be a plain string or a structured object supplied by code. */
export type CriteriaValue = string | Record<string, unknown> | unknown[];

export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: { true: CriteriaValue; false: CriteriaValue };
};

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  /** option key -> description. Max 255 options. */
  criteria: Record<string, CriteriaValue>;
};

export type ScoreQuestion = {
  type: "score";
  instructions: string;
  /** Ordered level descriptions, 2-10 of them. Index 0 is the lowest level. */
  criteria: string[];
};

export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

/**
 * A Noul carries no `confidence` field. Its probability IS the signal, and a
 * value near 0.5 means "as likely yes as no", not "medium intensity".
 */
export type NoulAnswer = { type: "noul"; noul: number };

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};

export type ScoreAnswer = {
  type: "score";
  /** Continuous position across the level indices, e.g. 1.05. */
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
};

export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export type SystemOneRequest = {
  model: string;
  state: unknown;
  questions: Record<string, Question>;
};

export type SystemOneResponse = {
  model: string;
  answers: Record<string, Answer>;
  usage?: { input_tokens: number; output_tokens: number };
};
