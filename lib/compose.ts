import type { Answer } from "@/lib/jev/types";
import type { OutputShape, VetoId } from "@/lib/questions";
import {
  ASSUMED_BELOW,
  FLOOR,
  HIGH_CONSEQUENCE_ACT,
  bandNoul,
  certaintyOf,
  isChoice,
  isNoul,
  isScore,
  scoreLevel,
} from "@/lib/bands";
import {
  VERDICT_HEADLINES,
  type Assumption,
  type DecidingJudgment,
  type Verdict,
  type VerdictKind,
} from "@/lib/verdict";

/**
 * §5 — code owns the verdict. Jev is never asked which mechanism should power
 * the feature; it answers fifteen narrow questions and this module composes
 * them.
 *
 * Every weight and threshold below is a named constant. Retuning one must never
 * require a new Jev call: the golden fixtures in tests/ replay recorded answers
 * through this function for free.
 */

// ---------------------------------------------------------------------------
// Tunable constants
// ---------------------------------------------------------------------------

/** §5.2 step 3 — composite weights. They sum to 1. */
export const WEIGHTS = {
  semantic_depth: 0.4,
  output_shape: 0.3,
  repeated_at_volume: 0.2,
  latency_sensitive: 0.1,
} as const;

/** Composite at or above this selects "Jev fits". */
export const JEV_FIT_THRESHOLD = 0.55;

/** How each output shape scores for Jev-fit. `unclear` never reaches here. */
export const OUTPUT_SHAPE_FIT: Record<OutputShape, number> = {
  closed_set: 1.0,
  degree_or_number: 0.8,
  structured_record: 0.6,
  action_with_parameters: 0.5,
  free_prose: 0.0,
  unclear: 0.0,
};

/**
 * Volume favours a typed judgment; a one-off does not need one.
 * Latency favours Jev over an LLM but is close to neutral against plain code,
 * so its "does not fire" end does not collapse to zero.
 */
const VOLUME_FIT = { fires: 1.0, uncertain: 0.5, does_not_fire: 0.0 } as const;
const LATENCY_FIT = { fires: 1.0, uncertain: 0.6, does_not_fire: 0.4 } as const;

/**
 * Veto precedence when several fire at once. Rules-first ordering: the cheapest
 * correct answer wins, so "an exact rule covers it" outranks everything.
 * `needs_generation` is handled separately (see composeVerdict) because it is
 * the one veto that can still leave a role for Jev alongside an LLM.
 */
export const VETO_PRECEDENCE: VetoId[] = [
  "deterministic_rule_exists",
  "needs_arithmetic",
  "needs_temporal_reasoning",
  "needs_numeric_comparison",
  "untrusted_input",
  "needs_multihop_reasoning",
  "needs_generation",
];

/**
 * DEPARTURE FROM THE SPEC (§4.1), made on measured evidence.
 *
 * The spec lists `untrusted_input` as one of seven independent vetoes. Held
 * that way it disqualifies almost every real Jev integration, because almost
 * all of them judge text somebody outside the company wrote: across the
 * recorded fixtures it fires at 0.88 on support-email routing, which is
 * TypeSafe's own canonical use case. A veto that rules out the canonical case
 * is encoding the weakness wrongly.
 *
 * What the jaggedness page actually says is that Jev "doesn't treat state as
 * hostile" — injected instructions can steer the answer. The cost of being
 * steered is what matters. Steered into a reversible label a human will see is
 * an annoyance; steered into a payout, a deletion or a publication is the
 * documented risk. So untrusted input disqualifies Jev when, and only when,
 * `high_consequence` also fires. Otherwise it is carried onto the card as a
 * caveat rather than silently deciding the verdict.
 */
export const CONDITIONAL_VETOES: VetoId[] = ["untrusted_input"];

const VETO_VERDICT: Record<VetoId, VerdictKind> = {
  deterministic_rule_exists: "just_write_code",
  needs_arithmetic: "just_write_code",
  needs_temporal_reasoning: "just_write_code",
  needs_numeric_comparison: "just_write_code",
  untrusted_input: "just_write_code",
  needs_multihop_reasoning: "use_an_llm",
  needs_generation: "use_an_llm",
};

const VETO_WHY: Record<VetoId, string> = {
  deterministic_rule_exists:
    "an exact rule decides this, and a rule you can read beats a judgment you have to trust",
  needs_arithmetic:
    "it has to count or calculate, and Jev recognises the shape of an answer rather than tallying",
  needs_temporal_reasoning:
    "it turns on dates, and Jev reads dates as text rather than as ordered quantities",
  needs_numeric_comparison:
    "it turns on numeric magnitude, which Jev cannot judge reliably",
  needs_multihop_reasoning:
    "the answer needs several dependent steps, and accuracy drops across hops",
  untrusted_input:
    "the judged text is public, and Jev does not treat its state as hostile — instructions written into that text can steer the answer",
  needs_generation: "Jev-1.13 is not trained to generate text",
};

const VETO_FLIP: Record<VetoId, string> = {
  deterministic_rule_exists:
    "cases the rule gets wrong. If listing the exceptions is harder than writing the rule, this becomes a judgment.",
  needs_arithmetic:
    "moving the counting into code. If the model only has to judge what each item is and your code does the tallying, the veto lifts.",
  needs_temporal_reasoning:
    "computing the dates in code first. Pass the model the conclusion — 'overdue', 'within the window' — instead of the raw dates.",
  needs_numeric_comparison:
    "comparing the numbers in code and passing the model the comparison's result in words.",
  needs_multihop_reasoning:
    "splitting the hops. Each step, asked as its own narrow question with the previous result in state, is back in range.",
  untrusted_input:
    "who writes the text. If it comes from your own systems or staff rather than the public, the veto lifts.",
  needs_generation:
    "whether the text has to be written or only chosen. Selecting from prepared responses is a judgment, not generation.",
};

const LABELS: Record<string, string> = {
  needs_generation: "Has to write new text",
  needs_arithmetic: "Has to count or calculate",
  needs_temporal_reasoning: "Has to reason about dates",
  needs_numeric_comparison: "Has to compare numbers",
  needs_multihop_reasoning: "Needs several dependent steps",
  untrusted_input: "Judges public or adversarial text",
  deterministic_rule_exists: "An exact rule would cover it",
  output_shape: "Shape of the output",
  repeated_at_volume: "Runs repeatedly at volume",
  latency_sensitive: "Sits in an interactive path",
  high_consequence: "A wrong answer causes material harm",
  semantic_depth: "Depth of language understanding needed",
  description_specificity: "How concretely the description pins the decision down",
  primitive_fit: "Primitive that would carry it",
  pattern_fit: "Pattern its shape would follow",
};

const OUTPUT_SHAPE_READING: Record<OutputShape, string> = {
  closed_set: "one option from a set known ahead of time",
  free_prose: "written prose",
  degree_or_number: "a position on a scale",
  structured_record: "a record of named fields",
  action_with_parameters: "an action plus its parameters",
  unclear: "not stated in the description",
};

/** The dimensions a visitor most often leaves unstated, in card order. */
const ASSUMPTION_DIMENSIONS: Record<string, string> = {
  repeated_at_volume: "How often this judgment runs",
  latency_sensitive: "Whether anyone is waiting on the answer",
  high_consequence: "What a wrong answer costs",
  untrusted_input: "Where the judged text comes from",
  output_shape: "What the feature outputs",
  semantic_depth: "How much language understanding it needs",
  deterministic_rule_exists: "Whether an exact rule would already cover it",
  needs_generation: "Whether it has to write text or only judge it",
  needs_arithmetic: "Whether it has to count or calculate",
  needs_temporal_reasoning: "Whether it has to reason about dates",
  needs_numeric_comparison: "Whether it has to compare numbers",
  needs_multihop_reasoning: "Whether it takes several dependent steps",
};

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

type Ctx = {
  answers: Record<string, Answer>;
  deciding: DecidingJudgment[];
  /** Would resolving `id` either way change the verdict? */
  material: (id: string, kind: VerdictKind) => boolean;
};

function consume(ctx: Ctx, id: string, reading: string, weight: number): void {
  const answer = ctx.answers[id];
  if (!answer) return;
  ctx.deciding.push({
    id,
    label: LABELS[id] ?? id,
    reading,
    certainty: certaintyOf(answer),
    weight,
  });
}

function noulReading(id: string, p: number): string {
  const band = bandNoul(p);
  if (band === "fires") return "yes";
  if (band === "does_not_fire") return "no";
  return "as likely as not";
}

export class MissingAnswerError extends Error {}

/**
 * Every question id must come back. A missing id is a contract failure, not a
 * reason to invent a verdict from what did arrive.
 */
function require_<T extends Answer>(
  answers: Record<string, Answer>,
  id: string,
  guard: (a: Answer | undefined) => a is T,
): T {
  const a = answers[id];
  if (!guard(a)) {
    throw new MissingAnswerError(
      `answer for "${id}" missing or of the wrong primitive type`,
    );
  }
  return a;
}

/** Pins an uncertain answer to each definite reading it could resolve to. */
function extremesOf(a: Answer): Answer[] {
  if (a.type === "noul") return [{ ...a, noul: 0.95 }, { ...a, noul: 0.05 }];
  if (a.type === "score") {
    const levels = Object.keys(a.probabilities).map(Number).sort((x, y) => x - y);
    const lo = levels[0] ?? 0;
    const hi = levels[levels.length - 1] ?? lo;
    return [lo, hi].map((lvl) => ({
      ...a,
      score: lvl,
      confidence: 0.95,
      probabilities: { [String(lvl)]: 0.95 },
    }));
  }
  return Object.keys(a.probabilities).map((opt) => ({
    ...a,
    choice: opt,
    confidence: 0.95,
    probabilities: { [opt]: 0.95 },
  }));
}

export function composeVerdict(
  answers: Record<string, Answer>,
  modelVersion: string,
  /** Internal: set while probing, to stop the materiality check recursing. */
  probing = false,
): Verdict {
  const ctx: Ctx = { answers, deciding: [], material: () => true };

  // Re-runs composition with one uncertain answer pinned to each extreme. The
  // recursion terminates because the probe's answers are all definite, so no
  // probe ever finds an answer below the floor to probe in turn.
  if (!probing) {
    ctx.material = (id, kind) => {
      const a = answers[id];
      if (!a) return false;
      for (const pinned of extremesOf(a)) {
        const probe = composeVerdict({ ...answers, [id]: pinned }, modelVersion, true);
        if (probe.kind !== kind) return true;
      }
      return false;
    };
  }

  // --- Step 1. Specificity gate. Runs first and depends on nothing else.
  const specificity = require_(answers, "description_specificity", isScore);
  const specificityLevel = scoreLevel(specificity);
  consume(
    ctx,
    "description_specificity",
    specificity.legend[String(specificityLevel)] ?? `level ${specificityLevel}`,
    1,
  );

  if (specificityLevel <= 0) {
    return finish(ctx, {
      kind: "not_enough_to_judge",
      why: "the description names a subject area rather than a decision, so there is nothing specific enough to rule on",
      whatWouldChangeThis:
        "Say what goes in, what comes out, and on what basis the call is made. One concrete sentence about a single decision is enough.",
      modelVersion,
      fitScore: null,
      provisional: false,
    });
  }

  // --- Step 2. Vetoes, before any weighting. A strong fit score cannot outvote
  // "Jev cannot generate text".
  const firing: VetoId[] = [];
  for (const id of VETO_PRECEDENCE) {
    const a = require_(answers, id, isNoul);
    if (bandNoul(a.noul) === "fires") firing.push(id);
  }

  const consequence = require_(answers, "high_consequence", isNoul);
  const consequenceFires = bandNoul(consequence.noul) === "fires";

  const blocking = firing.filter((id) => {
    if (id === "needs_generation") return false;
    // A conditional veto only blocks when a wrong answer would cost something
    // material; otherwise it rides along as a caveat.
    if (CONDITIONAL_VETOES.includes(id)) return consequenceFires;
    return true;
  });
  if (blocking.length > 0) {
    const winner = blocking[0]!; // VETO_PRECEDENCE order is preserved
    consume(ctx, winner, "yes", 1);
    for (const other of blocking.slice(1)) consume(ctx, other, "yes", 0.5);
    return finish(ctx, {
      kind: VETO_VERDICT[winner],
      why: VETO_WHY[winner],
      whatWouldChangeThis: `What would change this: ${VETO_FLIP[winner]}`,
      modelVersion,
      fitScore: null,
      provisional: false,
    });
  }

  const carriedCaveats = firing.filter(
    (id) => CONDITIONAL_VETOES.includes(id) && !blocking.includes(id),
  );

  // A veto sitting in the `uncertain` band is the case where we cannot say
  // whether Jev is disqualified at all. That is exactly a deciding answer below
  // the floor, so it is consumed here and the floor check in finish() turns it
  // into "Not enough to judge" naming the dimension. A veto that fires outright
  // is definite knowledge and has already won above.
  for (const id of VETO_PRECEDENCE) {
    const a = require_(answers, id, isNoul);
    if (bandNoul(a.noul) === "uncertain") consume(ctx, id, "as likely as not", 1);
  }

  // --- Step 3. Composite, over bands and Score levels only.
  const shape = require_(answers, "output_shape", isChoice);
  const shapeChoice = shape.choice as OutputShape;

  // A no-match answer is a real answer: the description did not say. Scoring it
  // as if it had would be inventing the missing half of the decision.
  if (shapeChoice === "unclear") {
    consume(ctx, "output_shape", OUTPUT_SHAPE_READING.unclear, 1);
    return finish(ctx, {
      kind: "not_enough_to_judge",
      why: "the description does not say what the feature returns, and the output shape is half of what decides this",
      whatWouldChangeThis:
        "Name the output. A fixed set of labels, a number, a record of fields, or written prose — each one points somewhere different.",
      modelVersion,
      fitScore: null,
      provisional: false,
    });
  }

  const depth = require_(answers, "semantic_depth", isScore);
  const depthLevel = scoreLevel(depth);
  const volume = require_(answers, "repeated_at_volume", isNoul);
  const latency = require_(answers, "latency_sensitive", isNoul);
  const generationFires = firing.includes("needs_generation");

  const depthFit = depthLevel / 3;
  const shapeFit = OUTPUT_SHAPE_FIT[shapeChoice];
  const volumeFit = VOLUME_FIT[bandNoul(volume.noul)];
  const latencyFit = LATENCY_FIT[bandNoul(latency.noul)];

  const fitScore =
    WEIGHTS.semantic_depth * depthFit +
    WEIGHTS.output_shape * shapeFit +
    WEIGHTS.repeated_at_volume * volumeFit +
    WEIGHTS.latency_sensitive * latencyFit;

  consume(ctx, "semantic_depth", depth.legend[String(depthLevel)] ?? `level ${depthLevel}`, WEIGHTS.semantic_depth);
  consume(ctx, "output_shape", OUTPUT_SHAPE_READING[shapeChoice], WEIGHTS.output_shape);
  consume(ctx, "repeated_at_volume", noulReading("repeated_at_volume", volume.noul), WEIGHTS.repeated_at_volume);
  consume(ctx, "latency_sensitive", noulReading("latency_sensitive", latency.noul), WEIGHTS.latency_sensitive);

  let kind: VerdictKind;
  let why: string;
  let flip: string;

  if (generationFires) {
    // The one veto that can leave Jev a role: it cannot write the text, but it
    // can decide whether, and on what, the writing happens.
    consume(ctx, "needs_generation", "yes", 1);
    // That role only exists when there is a typed decision alongside the prose:
    // if the output IS the prose, there is nothing for Jev to return.
    if (shapeChoice !== "free_prose" && fitScore >= JEV_FIT_THRESHOLD) {
      kind = "jev_plus_llm";
      why =
        "the output is written text, which Jev cannot produce — but the judgment in front of it is exactly the typed, repeated call Jev is for, so let Jev decide and gate, and let the LLM write";
      flip =
        "What would change this: whether the judgment in front of the writing is real. If there is nothing to decide before generating, it is an LLM call and nothing else.";
    } else {
      kind = "use_an_llm";
      why =
        "the output is written text, and there is no separate judgment in front of it worth typing";
      flip = `What would change this: ${VETO_FLIP.needs_generation}`;
    }
  } else if (depthLevel <= 1 && bandNoul(volume.noul) === "fires") {
    kind = "classical_ml";
    why =
      "the volume is there but the language is not: matching wording is all this needs, and labelled examples will beat a language judgment at that";
    flip =
      "What would change this: whether meaning varies with context. The moment the same words mean different things in different places, this moves back to a language judgment.";
  } else if (fitScore >= JEV_FIT_THRESHOLD) {
    kind = "jev_fits";
    why = `it is a repeated judgment over language with a ${OUTPUT_SHAPE_READING[shapeChoice]}, which is the shape typed judgments are for`;
    flip =
      "What would change this: the volume. A judgment made a handful of times a week is worth a person's attention rather than a model's.";
  } else if (depthLevel >= 2) {
    kind = "use_an_llm";
    why = `the judgment needs real reading, but its output is ${OUTPUT_SHAPE_READING[shapeChoice]}, which is not a shape a typed judgment returns well`;
    flip =
      "What would change this: the output. If it can be reduced to a fixed set of options, this becomes a typed judgment.";
  } else {
    kind = "just_write_code";
    why =
      "neither the language depth nor the volume is there — this is a handful of conditions, and conditions belong in code";
    flip =
      "What would change this: the wording. If the same thing arrives phrased a dozen ways, conditions stop covering it.";
  }

  // --- Step 4. Consequence adjustment. It does not change the verdict; it
  // raises the bar required to state it.
  if (consequenceFires) consume(ctx, "high_consequence", "yes", 0.5);

  if (carriedCaveats.includes("untrusted_input") && kind !== "just_write_code") {
    why += ". The text it judges is public, and Jev does not treat its state as hostile — keep the decision reversible and visible, because someone will write text aimed at steering it";
  }

  return finish(ctx, {
    kind,
    why,
    whatWouldChangeThis: flip,
    modelVersion,
    fitScore,
    provisional: false,
    consequenceFires,
  });
}

type Draft = {
  kind: VerdictKind;
  why: string;
  whatWouldChangeThis: string;
  modelVersion: string;
  fitScore: number | null;
  provisional: boolean;
  consequenceFires?: boolean;
};

/**
 * §5.2 step 5 — the floor check runs last, over the answers composition
 * actually consumed. Which answers matter is not knowable until composition has
 * run, so this cannot be part of the opening gate; and speculative answers on
 * branches nobody took are ignored however uncertain they are.
 */
function finish(ctx: Ctx, draft: Draft): Verdict {
  const deciding = [...ctx.deciding].sort((a, b) => b.weight - a.weight);

  // An answer below the floor only withholds the verdict if resolving it either
  // way would CHANGE the verdict. Measured need: `latency_sensitive` lands near
  // 0.5 on most descriptions, and it carries the smallest weight there is
  // (0.10) — without this check it withholds verdicts its own resolution could
  // not have altered, and "Not enough to judge" stops meaning anything.
  const belowFloor = deciding
    .filter((d) => d.certainty < FLOOR)
    .filter((d) => ctx.material(d.id, draft.kind))
    .sort((a, b) => b.weight - a.weight)[0];

  if (belowFloor && draft.kind !== "not_enough_to_judge") {
    return {
      kind: "not_enough_to_judge",
      headline: VERDICT_HEADLINES.not_enough_to_judge,
      why: `the verdict turned on "${belowFloor.label.toLowerCase()}", and the description does not settle it either way`,
      provisional: false,
      deciding: deciding.slice(0, 3),
      assumptions: assumptionsFrom(ctx),
      whatWouldChangeThis: `What would change this: say, in the description, ${belowFloor.label.toLowerCase()}.`,
      modelVersion: draft.modelVersion,
      fitScore: draft.fitScore,
    };
  }

  // A verdict is provisional when a wrong answer would cost something material
  // and the answers behind it sit in the confirm band rather than the act band.
  const weakest = deciding.reduce(
    (min, d) => Math.min(min, d.certainty),
    Number.POSITIVE_INFINITY,
  );
  const provisional =
    draft.consequenceFires === true &&
    weakest >= FLOOR &&
    weakest < HIGH_CONSEQUENCE_ACT;

  return {
    kind: draft.kind,
    headline: VERDICT_HEADLINES[draft.kind],
    why: draft.why,
    provisional,
    deciding: deciding.slice(0, 3),
    assumptions: assumptionsFrom(ctx),
    whatWouldChangeThis: draft.whatWouldChangeThis,
    modelVersion: draft.modelVersion,
    fitScore: draft.fitScore,
  };
}

/**
 * Mandatory on every card. The intake is one-shot, so the card must expose what
 * it filled in rather than imply certainty it does not have. An answer the model
 * gave weakly is one the description did not state.
 */
export function assumptionsFrom(ctx: Ctx): Assumption[] {
  const out: Assumption[] = [];
  for (const [id, dimension] of Object.entries(ASSUMPTION_DIMENSIONS)) {
    const a = ctx.answers[id];
    if (!a) continue;
    const certainty = certaintyOf(a);
    if (certainty >= ASSUMED_BELOW) continue;

    let assumed: string;
    if (isNoul(a)) {
      const band = bandNoul(a.noul);
      assumed =
        band === "uncertain"
          ? "read as genuinely open — treated as neither"
          : `read as ${band === "fires" ? "yes" : "no"}, but only just`;
    } else if (isChoice(a)) {
      assumed = `read as ${OUTPUT_SHAPE_READING[a.choice as OutputShape] ?? a.choice}, with other readings close behind`;
    } else {
      const lvl = scoreLevel(a);
      assumed = `read as "${a.legend[String(lvl)] ?? `level ${lvl}`}", with neighbouring levels close behind`;
    }
    out.push({ id, dimension, assumed });
  }
  return out;
}
