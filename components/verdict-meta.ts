import type { VerdictKind } from "@/lib/verdict";

/** Verdict colour is semantic state, not decoration. One token per outcome. */
export const VERDICT_COLOR: Record<VerdictKind, string> = {
  jev_fits: "var(--v-fits)",
  just_write_code: "var(--v-code)",
  use_an_llm: "var(--v-llm)",
  jev_plus_llm: "var(--v-both)",
  classical_ml: "var(--v-ml)",
  not_enough_to_judge: "var(--v-unknown)",
};

/** First-person line for the X share post, written as the poster talking. */
export const SHARE_LINE: Record<VerdictKind, string> = {
  jev_fits: "Turns out my feature doesn't need an LLM. A typed judgment from Jev does the job.",
  just_write_code: "Turns out my feature doesn't need AI at all. A few lines of code will do.",
  use_an_llm: "Checked whether my feature really needs an LLM. It does.",
  jev_plus_llm: "My feature splits in two: Jev makes the call, an LLM writes the words.",
  classical_ml: "Turns out my feature wants a model trained on my own labels, not an LLM.",
  not_enough_to_judge: "Asked whether my feature needs AI. Jev wants more detail before it rules.",
};

/** The one-line read, for people who will not read the paragraph. */
export const VERDICT_GIST: Record<VerdictKind, string> = {
  jev_fits: "A typed judgment is the right tool here.",
  just_write_code: "No model needed. Write the rule.",
  use_an_llm: "This wants a generative model.",
  jev_plus_llm: "Jev decides, the LLM writes.",
  classical_ml: "Train on your labels instead.",
  not_enough_to_judge: "Tell me a little more and I will rule.",
};

/** Short tile labels for the judgment grid. Long enough to mean something. */
export const TILE_LABEL: Record<string, string> = {
  needs_generation: "writes new text",
  needs_arithmetic: "counts or calculates",
  needs_temporal_reasoning: "reasons about dates",
  needs_numeric_comparison: "compares numbers",
  needs_multihop_reasoning: "takes dependent steps",
  untrusted_input: "reads public text",
  deterministic_rule_exists: "a rule would cover it",
  needs_external_lookup: "fetches outside data",
  output_shape: "output shape",
  repeated_at_volume: "runs at volume",
  latency_sensitive: "someone is waiting",
  high_consequence: "mistakes cost money",
  labelled_outcomes_exist: "labelled history exists",
  semantic_depth: "language depth",
  description_specificity: "how pinned down",
  states_input: "says what goes in",
  states_output: "says what comes out",
  primitive_fit: "primitive",
  pattern_fit: "pattern",
};

export const GROUPS: { title: string; note: string; ids: string[] }[] = [
  {
    title: "Blockers",
    note: "Any one of these rules Jev out on its own.",
    ids: [
      "needs_generation",
      "needs_arithmetic",
      "needs_temporal_reasoning",
      "needs_numeric_comparison",
      "needs_multihop_reasoning",
      "deterministic_rule_exists",
    ],
  },
  {
    title: "Caveats",
    note: "These do not rule Jev out. They change how you use it.",
    ids: ["untrusted_input", "needs_external_lookup"],
  },
  {
    title: "Shape",
    note: "These get weighed against each other in code.",
    ids: [
      "output_shape",
      "semantic_depth",
      "repeated_at_volume",
      "latency_sensitive",
      "high_consequence",
      "labelled_outcomes_exist",
    ],
  },
  {
    title: "Read of your description",
    note: "How much the description actually pins down.",
    ids: [
      "description_specificity",
      "states_input",
      "states_output",
      "primitive_fit",
      "pattern_fit",
    ],
  },
];

/** Vetoes read "fired" in red; the rest read neutral when true. */
export const BLOCKING = new Set([
  "needs_generation",
  "needs_arithmetic",
  "needs_temporal_reasoning",
  "needs_numeric_comparison",
  "needs_multihop_reasoning",
  "deterministic_rule_exists",
]);

export const EXAMPLES: { label: string; text: string }[] = [
  {
    label: "Route support email",
    text: "Every inbound support email has to land in one of nine queues (billing, bug, refund, account access, sales, partnership, abuse, press, other) based on what the customer is actually asking for.",
  },
  {
    label: "Country to currency",
    text: "Given a two-letter country code on the checkout form, return the currency we bill that country in.",
  },
  {
    label: "Write release notes",
    text: "Turn each merged pull request's title and diff summary into a paragraph of release notes written for end users.",
  },
  {
    label: "Moderate listings",
    text: "Flagged marketplace listings need a severity level of cosmetic, misleading, prohibited, or illegal, assigned from the listing title and body so moderators work the worst first.",
  },
  {
    label: "Something vague",
    text: "We run a logistics business and we think AI could help us somewhere in the operations side of things.",
  },
];

/**
 * The answer space, shown before anyone types. A stranger should know what the
 * tool can say before they know what Jev is. Ordered cheapest first.
 */
export const LEGEND: { kind: VerdictKind; cost: string }[] = [
  { kind: "just_write_code", cost: "free, deterministic" },
  { kind: "classical_ml", cost: "train once, cheap to run" },
  { kind: "jev_fits", cost: "one typed call" },
  { kind: "jev_plus_llm", cost: "decide, then write" },
  { kind: "use_an_llm", cost: "open-ended output" },
];

/** What to actually do on Monday, per verdict. Short enough to act on. */
export const NEXT_STEP: Record<VerdictKind, { title: string; steps: string[] }> = {
  just_write_code: {
    title: "Write the rule",
    steps: [
      "A lookup table, a regex, or an if-chain. It is free, instant and testable.",
      "Put the edge cases in unit tests, not in a prompt.",
      "Reach for a model only if the rule keeps growing exceptions.",
    ],
  },
  jev_fits: {
    title: "Make one typed call",
    steps: [
      "Define the options in code, each with a one-line meaning.",
      "Send the raw input as state. Get back a typed answer with a probability.",
      "Act above a confidence bar, queue for a human below it.",
    ],
  },
  use_an_llm: {
    title: "Use a generative model",
    steps: [
      "The output is open-ended, so it has to be written, not picked.",
      "Constrain it with a schema or examples, and validate what comes back.",
      "If a decision gates the writing, split that part out to a typed call.",
    ],
  },
  jev_plus_llm: {
    title: "Split decide from write",
    steps: [
      "A typed call picks the branch: which template, tone or route.",
      "An LLM writes only inside that branch, with a narrow prompt.",
      "You can log, test and gate the decision without reading prose.",
    ],
  },
  classical_ml: {
    title: "Train on your history",
    steps: [
      "You already have labelled outcomes at volume. That is training data.",
      "Start with gradient-boosted trees on the features you log today.",
      "Retrain on a schedule and watch drift, not vibes.",
    ],
  },
  not_enough_to_judge: {
    title: "Pin down one decision",
    steps: [
      "Say what goes in, what comes out, and what the call is based on.",
      "One concrete sentence about a single decision is enough.",
    ],
  },
};
