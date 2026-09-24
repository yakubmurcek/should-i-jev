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

/** Verdict line for the X share post: casual, but written in normal sentence case. */
export const SHARE_LINE: Record<VerdictKind, string> = {
  jev_fits: "Verdict: Jev fits. No LLM, no prompt wrangling, just a typed answer.",
  just_write_code: "Verdict: just write the if statement. No AI needed.",
  use_an_llm: "Verdict: this one actually needs an LLM.",
  jev_plus_llm: "Verdict: Jev makes the call, an LLM writes the words.",
  classical_ml: "Verdict: skip the LLM and train on my own labels.",
  not_enough_to_judge: "Verdict: Jev wants more detail first. Fair.",
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
    label: "Label GitHub issues",
    text: "Every new GitHub issue on my repo gets one label from its title and body: bug, feature request, question, or support, so I only read the bugs first.",
  },
  {
    label: "Work or personal email",
    text: "On signup, mark the email as personal if its domain is a free provider like gmail.com, outlook.com or icloud.com, and as work otherwise, so I only do sales outreach to companies.",
  },
  {
    label: "Sort cancel reasons",
    text: "When someone cancels, they type why in a free-text box. Sort each answer into too expensive, missing a feature, switched to a competitor, stopped using it, or too buggy, so I know what to fix first.",
  },
  {
    label: "Changelog to tweet",
    text: "Turn a list of merged pull request titles into one tweet announcing what we shipped.",
  },
  {
    label: "Trial ending email",
    text: "Send the user a reminder email three days before their free trial ends.",
  },
  {
    label: "Add AI to my SaaS",
    text: "I want to add AI to my SaaS so it feels smarter and people stop churning.",
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
