import type { Question } from "@/lib/jev/types";

/**
 * The fifteen questions of spec §4, sent as ONE request over ONE subject.
 * They are evaluated in parallel and cannot see one another, so none of them
 * may depend on another's answer. Code composes the verdict (lib/compose.ts).
 *
 * There is deliberately no broad "which mechanism should power this?" question:
 * broad phrasing invites overconfidence and hides the signals code weighs
 * separately.
 */

export const VETO_IDS = [
  "needs_generation",
  "needs_arithmetic",
  "needs_temporal_reasoning",
  "needs_numeric_comparison",
  "needs_multihop_reasoning",
  "untrusted_input",
  "deterministic_rule_exists",
] as const;

export type VetoId = (typeof VETO_IDS)[number];

export const OUTPUT_SHAPES = [
  "closed_set",
  "free_prose",
  "degree_or_number",
  "structured_record",
  "action_with_parameters",
  "unclear",
] as const;

export type OutputShape = (typeof OUTPUT_SHAPES)[number];

/**
 * Supplied to the two speculative questions as structured criteria. Jev cannot
 * be assumed to know TypeSafe's own API from its weights — never rely on model
 * weights for information the code already possesses.
 */
export const PRIMITIVE_DEFINITIONS = {
  choice: {
    covers: "Selecting exactly one option from a set the code defines up front.",
    not_for: "Open-ended output, or questions where several options are true at once.",
    example: "Route a support email to one of nine queues.",
  },
  noul: {
    covers:
      "A single condition that either holds or does not, answered as a calibrated probability that it holds.",
    not_for: "Questions with more than two outcomes, or questions of degree.",
    example: "Is this message asking for a refund?",
  },
  score: {
    covers:
      "Placing something on an ordered scale whose levels the code defines, each level describing a concrete situation.",
    not_for: "Unordered categories, or arithmetic over numbers in the state.",
    example: "How severe is this bug report, from cosmetic to data loss?",
  },
  combination: {
    covers:
      "Several of the above asked together about the same subject in one request, each answering a narrow judgment the code handles separately.",
    not_for: "A single narrow judgment that one primitive already covers.",
    example: "A Choice for the category plus a Noul for whether the text is a complaint.",
  },
  none_fits: {
    covers:
      "The work described does not reduce to typed judgments over one subject at all.",
    not_for: "Cases that merely need the option set rewriting.",
    example: "Rendering a chart, or transcribing audio.",
  },
} as const;

export const PATTERN_DEFINITIONS = {
  speculative_fan_out: {
    covers:
      "Asking many questions about one subject in a single request, including ones whose premise may prove irrelevant, and letting code discard the answers it does not need.",
    not_for: "Packing several independent subjects into one request.",
    example:
      "Asking about category, urgency and refund intent at once, then using urgency only when the category is billing.",
  },
  confidence_gated_routing: {
    covers:
      "Using the answer to decide what, and the confidence to decide whether to act, with a higher bar for consequential outcomes.",
    not_for: "Cases where every outcome carries the same consequence and one bar suffices.",
    example: "Auto-applying a category above 0.85 and queueing it for a human below.",
  },
  composite_scoring: {
    covers:
      "Combining several Score answers into one number, with the weights kept in code so they can be retuned without new inference.",
    not_for: "A single judgment that one question already answers.",
    example: "Blending severity, reach and effort into one triage priority.",
  },
  intent_routing: {
    covers: "Classifying what the user is trying to do, then dispatching to a handler for it.",
    not_for: "Judgments that do not select a downstream code path.",
    example: "Deciding whether a chat message is a booking, a cancellation or a question.",
  },
  none_fits: {
    covers: "None of TypeSafe's four documented patterns describes the shape of this work.",
    not_for: "Cases that match a pattern under a different name.",
    example: "A one-off manual review performed by a person.",
  },
} as const;

export const QUESTIONS: Record<string, Question> = {
  // ---- §4.1 Vetoes. Each maps to a documented Jev weakness or to an
  // "ordinary code is enough" condition, and each independently disqualifies Jev.
  needs_generation: {
    type: "noul",
    instructions:
      "Does the described feature have to produce new natural-language text as its own output, rather than judge, classify or select existing text?",
    criteria: {
      true: "The feature's output is itself written language that did not exist before: a reply, a summary, a description, a rewritten passage, a generated message.",
      false:
        "The feature's output is a decision about existing text or data: a label, a flag, a rank, a score, a selected option, or a record of fields copied from the input.",
    },
  },
  needs_arithmetic: {
    type: "noul",
    instructions:
      "Does the described feature require counting items, tallying values, or doing arithmetic over a collection in order to reach its answer?",
    criteria: {
      true: "Reaching the answer means counting how many things there are, summing or averaging values, or otherwise computing a number from a collection.",
      false:
        "The answer depends on what the content means or which category it belongs to, not on any count or calculation.",
    },
  },
  needs_temporal_reasoning: {
    type: "noul",
    instructions:
      "Does the described feature require comparing dates or times, computing a duration, or checking whether something falls inside a time window?",
    criteria: {
      true: "Reaching the answer means putting dates in order, measuring how long something took, or deciding whether a moment falls before, after or within a period.",
      false:
        "Dates may appear in the input, but the answer does not depend on ordering them, measuring between them, or bounding them.",
    },
  },
  needs_numeric_comparison: {
    type: "noul",
    instructions:
      "Does the described feature require judging the magnitude of numbers, or how close two numeric values are to each other?",
    criteria: {
      true: "Reaching the answer means deciding that a value is large, small, near another value, or over a threshold expressed as a number.",
      false:
        "Numbers may appear in the input, but the answer turns on meaning or category rather than on numeric magnitude or proximity.",
    },
  },
  // Narrowed from "several dependent steps, a plan, OR tool use". TypeSafe's
  // Noul page is explicit that compound questions should be split and combined
  // in code, and measurement showed why: bundled, this scored 0.75 on a plain
  // country-code lookup and vetoed it to "use an LLM". Split, the same case is
  // dependent-steps 0.22 (correctly no) and external-lookup 0.94 (correctly
  // yes). Needing a lookup is not a reasoning weakness — see
  // `needs_external_lookup` below.
  needs_multihop_reasoning: {
    type: "noul",
    instructions:
      "Does reaching the answer require working through intermediate conclusions in a fixed order, where a later step cannot be taken until an earlier one is settled?",
    criteria: {
      true: "The answer depends on a chain: something must be established first, and only then does the next part become answerable.",
      false:
        "The answer can be judged directly from the input in one step, even if that judgment needs real understanding of the language.",
    },
  },
  untrusted_input: {
    type: "noul",
    // The first wording of this question scored 0.94-0.97 on all 27 fixtures —
    // it fired even on a country-code lookup. Measured cause: the model was
    // reading it against the state's own "untrusted third-party input" label
    // and answering about the DESCRIPTION's provenance. Naming the feature's
    // runtime explicitly, and telling it to disregard the description's own
    // origin, moved a lookup from 0.94 to 0.24 while a public vendor-application
    // form stayed at 0.89. Literal reading: it answers the question you wrote.
    instructions:
      "Ignore where this description itself came from. At the time the described feature RUNS in production, will the data it reads be written by members of the public, or by anyone with a motive to influence its decision?",
    criteria: {
      true: "The judged text is written by members of the public, anonymous users, or anyone with a motive to influence the outcome in their favour.",
      false:
        "The judged text comes from the operator's own systems, staff, or trusted partners, where nobody gains by manipulating the decision.",
    },
  },
  deterministic_rule_exists: {
    type: "noul",
    instructions:
      "Could an exact rule, lookup table, or pattern match decide this correctly, without any understanding of language?",
    criteria: {
      true: "A programmer could write the decision out as explicit conditions, a table of known values, or a pattern to match, and it would be right.",
      false:
        "Any explicit rule would miss cases, because the decision depends on what the wording means rather than on the exact values present.",
    },
  },

  // ---- Architecture note, not a veto.
  // Needing to fetch evidence does not disqualify Jev: the documented shape is
  // that code retrieves, then the model judges what was retrieved. So this
  // answer never blocks a verdict; it changes the advice the card gives.
  needs_external_lookup: {
    type: "noul",
    instructions:
      "Does reaching the answer require fetching data that is not in the input, calling a tool, querying a system, or looking something up elsewhere?",
    criteria: {
      true: "Everything needed to decide is not present in the text itself; something must be retrieved from outside it first.",
      false: "Everything needed to decide is present in the input as given.",
    },
  },

  // §5.4 defines classical ML as "high volume, labelled outcomes, no language
  // understanding needed". The composite was testing volume and depth and
  // ASSUMING the labels. Measured consequence: refund-intent detection came
  // back at depth level 1 and was routed to classical ML — but recognising that
  // "money back", "chargeback" and "cancel and refund me" mean the same thing
  // is what Jev is for, and a team with no labelled history cannot train
  // anything. Without labels the honest answer is a typed judgment.
  labelled_outcomes_exist: {
    type: "noul",
    instructions:
      "Does the team already have a large history of past examples of this decision WITH the correct answer recorded for each, enough to train a model on?",
    criteria: {
      true: "The decision has been made many times already and each past answer was recorded, so the history could be used as training data today.",
      false:
        "There is no recorded history of correct answers: the decision is new, made ad hoc, or its outcomes were never captured in a usable form.",
    },
  },

  // ---- §4.2 Shape and weight.
  output_shape: {
    type: "choice",
    instructions:
      "What shape does the feature's own output take, as the description presents it?",
    criteria: {
      closed_set:
        "One option chosen from a set of possibilities that is known ahead of time and does not change per request.",
      free_prose: "Written natural language composed for a reader.",
      degree_or_number:
        "A position on a scale, a rating, a rank or a likelihood, rather than a named category.",
      structured_record:
        "A set of named fields filled in from the input, such as extracted details or a populated form.",
      action_with_parameters:
        "A decision to perform some operation, together with the values that operation needs.",
      unclear:
        "The description does not say what the feature outputs, so none of the above can be selected from it.",
    },
  },
  repeated_at_volume: {
    type: "noul",
    instructions:
      "Is this judgment made repeatedly across many items, rather than once or only occasionally?",
    criteria: {
      true: "The same judgment runs over a stream or backlog of many items: every message, every row, every upload.",
      false:
        "The judgment happens rarely: once per project, on demand for a single case, or at a human's initiative.",
    },
  },
  latency_sensitive: {
    type: "noul",
    instructions:
      "Does this judgment sit in a path where a person or system is waiting on the answer right now?",
    criteria: {
      true: "The answer is needed while someone waits: during a page load, mid-conversation, or inside a request that must return quickly.",
      false:
        "The answer can be produced in the background, in a batch, or on a schedule, with nobody blocked on it.",
    },
  },
  high_consequence: {
    type: "noul",
    instructions:
      "Would a wrong answer here cause material harm, losing money, endangering someone, creating legal exposure, or taking an action that cannot be undone?",
    criteria: {
      true: "A mistake costs money, affects someone's safety or rights, creates legal exposure, or performs an irreversible action such as deleting, publishing or paying.",
      false:
        "A mistake is an inconvenience that a person can notice and correct, with nothing lost but a little time.",
    },
  },
  semantic_depth: {
    type: "score",
    instructions:
      "How much understanding of language does deciding this correctly actually require?",
    // Levels describe concrete, non-overlapping situations and stand alone.
    criteria: [
      "The input contains an exact value, a code, an ID, a fixed keyword, and finding that value settles the answer. A lookup table would be right every time.",
      "The same thing arrives worded many different ways, with synonyms, abbreviations and typos. Recognising that two phrasings mean the same thing settles it; nothing else is needed.",
      "The same words mean different things in different places, so the surrounding text decides which reading is correct.",
      "Someone who knows the field weighs competing considerations, and two informed practitioners could reasonably disagree about a borderline case.",
    ],
  },

  // Which HALF of the decision is missing. `description_specificity` says how
  // pinned-down a description is but not which end is vague, and the card needs
  // that to offer something to fill in instead of a dead end.
  states_input: {
    type: "noul",
    instructions:
      "Does the description say what data the feature actually reads, the text, record or values it looks at when it runs?",
    criteria: {
      true: "The input is identified concretely enough to picture: an email, a listing, a transcript, a row with named fields.",
      false: "What the feature reads is left unsaid, or gestured at so generally that it could be almost anything.",
    },
  },
  states_output: {
    type: "noul",
    instructions:
      "Does the description say what the feature hands back, the label, number, record or action that comes out of it?",
    criteria: {
      true: "The output is identified concretely enough to picture: a category from a named set, a score, a flag, a filled record, an action taken.",
      false: "What comes out is left unsaid, or described only as something vague like 'handles it' or 'works out what to do'.",
    },
  },

  // ---- §4.3 Gate.
  description_specificity: {
    type: "score",
    instructions:
      "How concretely does the description pin down what goes in, what comes out, and the decision being made in between?",
    criteria: [
      "It names a subject area or an ambition, an industry, a product, a hope that AI might help, without identifying any particular decision.",
      "It names a decision but says neither what data goes in nor what comes out.",
      "It pins down one side only: either what goes in or what comes out, with the other side left to guess.",
      "It states what goes in, what comes out, and the basis for the call, so a programmer could start without asking a question.",
    ],
  },

  // ---- §4.4 Speculative payload. Consumed only when Jev survives the vetoes,
  // and discarded otherwise; that discarding is the documented fan-out behaviour.
  primitive_fit: {
    type: "choice",
    instructions:
      "Assuming this feature were built with TypeSafe's Jev, which of these typed primitives would carry the judgment? Each option is defined below in full; judge only against those definitions.",
    criteria: PRIMITIVE_DEFINITIONS,
  },
  pattern_fit: {
    type: "choice",
    instructions:
      "Assuming this feature were built with TypeSafe's Jev, which of these documented integration patterns would its shape follow? Each option is defined below in full; judge only against those definitions.",
    criteria: PATTERN_DEFINITIONS,
  },
};

export const QUESTION_IDS = Object.keys(QUESTIONS);
