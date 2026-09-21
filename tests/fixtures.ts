import type { Answer } from "@/lib/jev/types";
import type { VerdictKind } from "@/lib/verdict";
import { choice, noul, score, withAnswers } from "./answers";

/**
 * §8 — the golden fixtures.
 *
 * The composition layer is deterministic given a set of answers, and that
 * boundary is the whole test strategy: these run offline and free, so weights,
 * bands and thresholds can be retuned without spending a token.
 *
 * PROVENANCE: the `answers` below are hand-authored to the wire shapes in
 * lib/jev/types.ts, not recorded from a live run — this repository has never
 * held a TypeSafe key. Run `npm run record:fixtures` with TYPESAFE_API_KEY set
 * to replace them with real recorded answers for these same descriptions; the
 * expectations are what should then be re-examined, and any disagreement
 * between a real answer and the hand-authored one is a finding, not a failure
 * to paper over.
 */
export type Fixture = {
  id: string;
  description: string;
  expect: VerdictKind;
  /** What this fixture is here to prove. */
  proves: string;
  /** Extra assertions beyond the verdict kind. */
  alsoExpect?: { provisional?: boolean; decidingIncludes?: string };
  answers: Record<string, Answer>;
};

/** A veto fires against the otherwise-strong baseline, proving it overrides. */
const vetoFires = (id: string, extra: Record<string, Answer> = {}) =>
  withAnswers({ [id]: noul(0.93), ...extra });

export const FIXTURES: Fixture[] = [
  // ---- Obvious Jev -------------------------------------------------------
  {
    id: "jev-support-routing",
    description:
      "Every inbound support email has to land in one of nine queues — billing, bug, refund, account access, sales, partnership, abuse, press, other — based on what the customer is actually asking for.",
    expect: "jev_fits",
    proves: "the canonical case: repeated, semantic, closed-shape judgment",
    answers: withAnswers({}),
  },
  {
    id: "jev-refund-intent",
    description:
      "On each incoming chat message we want a flag for whether the customer is asking for their money back, so the agent view can surface those first.",
    expect: "jev_fits",
    proves: "a single Noul-shaped judgment at volume still reads as Jev",
    answers: withAnswers({
      output_shape: choice("closed_set", 0.9),
      primitive_fit: choice("noul", 0.91),
    }),
  },
  {
    id: "jev-listing-severity",
    description:
      "Flagged marketplace listings need a severity level — cosmetic, misleading, prohibited, or illegal — assigned from the listing title and body so moderators work the worst first.",
    expect: "jev_fits",
    proves: "a Score-shaped judgment over language at volume",
    answers: withAnswers({
      output_shape: choice("degree_or_number", 0.86),
      semantic_depth: score("semantic_depth", 3, 0.83),
      primitive_fit: choice("score", 0.88),
    }),
  },

  // ---- Each veto firing in isolation, against a strong baseline ----------
  {
    id: "veto-deterministic-rule",
    description:
      "Route each order to a warehouse based on the destination postcode, using the region table we already maintain.",
    expect: "just_write_code",
    proves: "deterministic_rule_exists overrides an otherwise strong Jev-fit score",
    alsoExpect: { decidingIncludes: "deterministic_rule_exists" },
    answers: vetoFires("deterministic_rule_exists"),
  },
  {
    id: "veto-arithmetic",
    description:
      "For each invoice, work out how many line items exceed the agreed rate and total the overcharge across them.",
    expect: "just_write_code",
    proves: "counting and tallying disqualify Jev — it recognises shapes, it does not tally",
    alsoExpect: { decidingIncludes: "needs_arithmetic" },
    answers: vetoFires("needs_arithmetic"),
  },
  {
    id: "veto-temporal",
    description:
      "Decide whether each subscription renewal falls inside the customer's 14-day cooling-off window.",
    expect: "just_write_code",
    proves: "date ordering and window checks disqualify Jev — it reads dates as text",
    alsoExpect: { decidingIncludes: "needs_temporal_reasoning" },
    answers: vetoFires("needs_temporal_reasoning"),
  },
  {
    id: "veto-numeric",
    description:
      "Flag a price as suspicious when it sits far below the median for its category.",
    expect: "just_write_code",
    proves: "numeric magnitude and proximity disqualify Jev",
    alsoExpect: { decidingIncludes: "needs_numeric_comparison" },
    answers: vetoFires("needs_numeric_comparison"),
  },
  {
    id: "veto-untrusted-input-when-consequential",
    description:
      "Read publicly submitted vendor applications and decide which ones get fast-tracked for approval.",
    expect: "just_write_code",
    proves:
      "adversarial state disqualifies Jev when a wrong answer costs something material — it does not treat its state as hostile",
    alsoExpect: { decidingIncludes: "untrusted_input" },
    answers: vetoFires("untrusted_input", { high_consequence: noul(0.9) }),
  },
  {
    id: "untrusted-input-is-a-caveat-when-reversible",
    description:
      "Every inbound support email has to land in one of nine queues based on what the customer is asking for. An agent sees the queue and can move it.",
    expect: "jev_fits",
    proves:
      "public text alone does not disqualify Jev — almost every real integration judges text somebody outside the company wrote, including TypeSafe's own canonical case. Steered into a reversible label is an annoyance; steered into a payout is the documented risk",
    answers: withAnswers({ untrusted_input: noul(0.93), high_consequence: noul(0.08) }),
  },
  {
    id: "veto-multihop",
    description:
      "Work out whether a claim is covered: find the policy it belongs to, check which endorsements applied on the incident date, then decide if the exclusion list catches it.",
    expect: "use_an_llm",
    proves: "multi-hop indirection disqualifies Jev and points at an LLM, not at code",
    alsoExpect: { decidingIncludes: "needs_multihop_reasoning" },
    answers: vetoFires("needs_multihop_reasoning"),
  },
  {
    id: "veto-generation-prose-output",
    description:
      "Write a personalised reply to each support email in the customer's own language and tone.",
    expect: "use_an_llm",
    proves: "generation with prose output is an LLM job outright — Jev-1.13 is not trained to generate text",
    alsoExpect: { decidingIncludes: "needs_generation" },
    answers: vetoFires("needs_generation", {
      output_shape: choice("free_prose", 0.95),
      semantic_depth: score("semantic_depth", 3, 0.9),
    }),
  },
  {
    id: "veto-generation-with-typed-decision",
    description:
      "For each inbound support email, decide which of our four escalation tiers it belongs to and then draft the acknowledgement that goes with that tier.",
    expect: "jev_plus_llm",
    proves: "generation does not disqualify Jev when a typed decision sits in front of the writing",
    alsoExpect: { decidingIncludes: "needs_generation" },
    answers: vetoFires("needs_generation", {
      output_shape: choice("action_with_parameters", 0.85),
    }),
  },

  // ---- Veto precedence ---------------------------------------------------
  {
    id: "precedence-rule-beats-generation",
    description:
      "When an order's status code is one of our three known failure codes, write the customer an apology email.",
    expect: "just_write_code",
    proves: "rules-first precedence: an exact rule outranks every other firing veto",
    alsoExpect: { decidingIncludes: "deterministic_rule_exists" },
    answers: withAnswers({
      deterministic_rule_exists: noul(0.91),
      needs_generation: noul(0.94),
      output_shape: choice("free_prose", 0.9),
    }),
  },
  {
    id: "precedence-arithmetic-beats-multihop",
    description:
      "Count the overdue line items on each account, then look up the collections tier that count maps to and apply it.",
    expect: "just_write_code",
    proves: "a code-shaped veto outranks an LLM-shaped one",
    alsoExpect: { decidingIncludes: "needs_arithmetic" },
    answers: withAnswers({
      needs_arithmetic: noul(0.9),
      needs_multihop_reasoning: noul(0.88),
    }),
  },

  // ---- Obvious code ------------------------------------------------------
  {
    id: "code-currency-lookup",
    description:
      "Given a two-letter country code on the checkout form, return the currency we bill that country in.",
    expect: "just_write_code",
    proves: "a lookup table is not a judgment",
    answers: withAnswers({
      deterministic_rule_exists: noul(0.97),
      semantic_depth: score("semantic_depth", 0, 0.94),
      repeated_at_volume: noul(0.9),
    }),
  },
  {
    id: "code-shallow-and-rare",
    description:
      "Once a quarter, mark which of our six internal report templates a finance request is asking for, based on the template name the requester typed.",
    expect: "just_write_code",
    proves: "no veto fires, but with neither depth nor volume the composite still lands on code",
    answers: withAnswers({
      semantic_depth: score("semantic_depth", 1, 0.88),
      repeated_at_volume: noul(0.07),
      latency_sensitive: noul(0.06),
      deterministic_rule_exists: noul(0.3),
    }),
  },

  // ---- Obvious LLM -------------------------------------------------------
  {
    id: "llm-release-notes",
    description:
      "Turn each merged pull request's title and diff summary into a paragraph of release notes written for end users.",
    expect: "use_an_llm",
    proves: "the output is the prose, so there is nothing typed for Jev to return",
    answers: vetoFires("needs_generation", {
      output_shape: choice("free_prose", 0.96),
      semantic_depth: score("semantic_depth", 3, 0.89),
    }),
  },
  {
    id: "llm-deep-but-open-output",
    description:
      "Read each incident post-mortem and produce the structured set of follow-up actions the reader should take, whatever those turn out to be.",
    expect: "use_an_llm",
    proves: "real reading with an open-ended output is not a shape a typed judgment returns",
    answers: withAnswers({
      output_shape: choice("free_prose", 0.82),
      semantic_depth: score("semantic_depth", 3, 0.86),
      repeated_at_volume: noul(0.2),
      latency_sensitive: noul(0.05),
    }),
  },

  // ---- Classical ML ------------------------------------------------------
  {
    id: "ml-high-volume-shallow",
    description:
      "Across roughly two million product titles a day, tag each one with the department it belongs to; the titles use the same vocabulary over and over, just spelled and abbreviated differently.",
    expect: "classical_ml",
    proves: "volume without language understanding is a classifier's job, not a typed judgment's",
    answers: withAnswers({
      semantic_depth: score("semantic_depth", 1, 0.91),
      repeated_at_volume: noul(0.98),
      labelled_outcomes_exist: noul(0.93),
      deterministic_rule_exists: noul(0.25),
    }),
  },
  {
    id: "ml-not-when-context-matters",
    description:
      "Across two million product titles a day, tag the department — but the same word means different things depending on the brand it appears with.",
    expect: "jev_fits",
    proves: "the classical-ML boundary is language depth: at level 2 it moves back to a typed judgment",
    answers: withAnswers({
      semantic_depth: score("semantic_depth", 2, 0.89),
      repeated_at_volume: noul(0.98),
    }),
  },

  // ---- The specificity gate ---------------------------------------------
  {
    id: "gate-domain-only",
    description:
      "We run a logistics business and we think AI could help us somewhere in the operations side of things.",
    expect: "not_enough_to_judge",
    proves: "the gate runs first and stops everything: a subject area is not a decision",
    alsoExpect: { decidingIncludes: "description_specificity" },
    answers: withAnswers({
      description_specificity: score("description_specificity", 0, 0.93),
      // Deliberately strong elsewhere: the gate must not be outvoted.
      semantic_depth: score("semantic_depth", 3, 0.9),
    }),
  },
  {
    id: "gate-unclear-output-shape",
    description:
      "Something that looks at each new user signup and works out what we ought to do about it.",
    expect: "not_enough_to_judge",
    proves: "the no-match option on output_shape is a real answer, not a scoring input",
    alsoExpect: { decidingIncludes: "output_shape" },
    answers: withAnswers({
      output_shape: choice("unclear", 0.88),
      description_specificity: score("description_specificity", 1, 0.85),
    }),
  },

  // ---- The floor check, on consumed answers only -------------------------
  {
    id: "floor-uncertain-veto",
    description:
      "Decide whether each contractor timesheet entry needs a manager's sign-off before payroll runs.",
    expect: "not_enough_to_judge",
    proves: "a veto in the uncertain band means we cannot say whether Jev is disqualified at all",
    alsoExpect: { decidingIncludes: "needs_temporal_reasoning" },
    answers: withAnswers({ needs_temporal_reasoning: noul(0.5) }),
  },
  {
    id: "floor-weak-deciding-answer",
    description:
      "Sort incoming tickets into whichever of our categories fits, however many of those there turn out to be.",
    expect: "not_enough_to_judge",
    proves: "a consumed answer below the 0.6 floor withholds the verdict and names the dimension",
    // The output shape is split between a fixed set of labels and written
    // prose. Those resolve to different verdicts — a typed judgment or an LLM —
    // so the uncertainty is material and the verdict is withheld.
    alsoExpect: { decidingIncludes: "output_shape" },
    answers: withAnswers({
      output_shape: {
        type: "choice",
        choice: "closed_set",
        probabilities: { closed_set: 0.45, free_prose: 0.4, structured_record: 0.15 },
        confidence: 0.45,
      },
    }),
  },
  {
    id: "floor-ignores-discarded-speculation",
    description:
      "Every inbound support email has to land in one of nine queues based on what the customer is asking for.",
    expect: "jev_fits",
    proves:
      "speculative answers on branches nobody took are ignored however uncertain — uncertainty on a discarded branch is not a reason to withhold a verdict",
    answers: withAnswers({
      primitive_fit: choice("none_fits", 0.11),
      pattern_fit: choice("none_fits", 0.09),
    }),
  },
  {
    id: "floor-ignores-unfired-veto-certainty",
    description:
      "Decide which of four onboarding tracks a new customer belongs in, from what they wrote about their team.",
    expect: "jev_fits",
    proves: "a veto that confidently does not fire is never consumed, so it cannot drag the verdict down",
    answers: withAnswers({ needs_arithmetic: noul(0.03) }),
  },

  // ---- Consequence adjustment -------------------------------------------
  {
    id: "consequence-provisional",
    description:
      "Decide whether a withdrawal request looks like account takeover, and freeze the payout if it does.",
    expect: "jev_fits",
    proves:
      "high consequence does not change the verdict; it raises the bar required to state it, so the card says provisional",
    alsoExpect: { provisional: true },
    answers: withAnswers({
      high_consequence: noul(0.94),
      // Consumed at weight 0.2 and sitting in the confirm band (0.6-0.85),
      // which is what makes a consequential verdict provisional.
      repeated_at_volume: noul(0.75),
      untrusted_input: noul(0.2),
    }),
  },
  {
    id: "consequence-not-provisional-when-certain",
    description:
      "Decide whether a withdrawal request looks like account takeover, and freeze the payout if it does.",
    expect: "jev_fits",
    proves: "high consequence above the 0.85 act band states the verdict plainly",
    alsoExpect: { provisional: false },
    answers: withAnswers({
      high_consequence: noul(0.94),
      semantic_depth: score("semantic_depth", 2, 0.93),
      output_shape: choice("closed_set", 0.96),
      description_specificity: score("description_specificity", 3, 0.95),
      repeated_at_volume: noul(0.97),
      latency_sensitive: noul(0.95),
    }),
  },
];
