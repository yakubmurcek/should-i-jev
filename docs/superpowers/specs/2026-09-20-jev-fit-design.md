# ShouldIJev — design spec

**Date:** 2026-09-20
**Status:** approved design, not yet implemented
**Name:** ShouldIJev, written "Should I Jev?" wherever a visitor reads it.
Drafted under the working name `jev-fit`, which survives only as the repo
directory and as the internal term "Jev-fit score".

---

## 1. What this is

A single-page developer tool. A developer describes a feature or workflow in one
free-text box, submits once, and gets a verdict on what should power it — one of
the six outcomes in §5.4, which include plain code, Jev, an LLM, and "not enough
to judge".

The tool is deliberately willing to say **no**. A recommender that always
recommends Jev is worthless to a developer and embarrassing to TypeSafe.

### Positioning

TypeSafe publishes what Jev is good at (`concepts/use-case-map`) and, on a page
absent from `llms.txt`, what it is bad at (`model-jaggedness/jev-1.13`): literal
reading, counting and arithmetic, temporal reasoning, numeric proximity,
multi-hop indirection, adversarial state, and text generation.

Both halves exist as prose. Nobody runs them against *your* feature. That is the
product: **an executable reading of TypeSafe's own jaggedness list, applied to a
described idea.**

### Why it is credible

The verdict is produced by Jev itself, using the patterns TypeSafe documents —
speculative fan-out for the questions, code-owned composition for the verdict,
confidence-gated routing for when to withhold one. The site is its own worked
example, and the reasoning is shown rather than asserted.

---

## 2. Non-goals

- **Not a cost calculator.** TypeSafe publishes no pricing page. Cost may be
  described relatively ("cheaper than an LLM call for this shape of judgment"),
  never as a number.
- **Not a lead-gen quiz.** No email capture, no funnel, no score out of 100.
- **Not a code generator** in v0. Drafting the visitor's actual question set is
  v1.
- **Not a chat.** One box, one submit, one verdict. No follow-up turns.
- **Not an agent.** Code owns control flow throughout.

---

## 3. User flow

1. Visitor lands on a page explaining, in about three sentences, what Jev is: it
   returns typed judgments and calibrated probabilities rather than prose, so it
   sits between an `if` statement and an LLM.
2. Visitor types a description of their feature and submits.
3. One request to Jev carries the whole question set.
4. Code composes a verdict and renders a **verdict card**.
5. The verdict is stored and gets a permalink.

### The verdict card

- **Headline verdict** — one of the outcomes in §5.4.
- **One-line why** — composed by code from the answers that drove it.
- **The deciding judgments** — the two or three answers that actually moved the
  verdict, each with its probability. Not all fifteen.
- **What we assumed** — every dimension the description left unstated. This is
  mandatory: the intake is one-shot, so the card must expose what it filled in
  rather than imply certainty it does not have.
- **What would change this** — the single detail most likely to flip the verdict.
- **Model version** — jaggedness is version-specific, so the card names the
  model version that judged it.
- **Show your work** — a collapsed panel with the exact state, questions,
  answers and probabilities. This is the credibility payload.

---

## 4. The judgment layer

One request. One subject (the description). Fifteen questions, evaluated in
parallel — the documented speculative fan-out pattern.

Fifteen is justified by the build guide's own test: *"Decompose when it exposes
independent signals your code will separately handle."* Every question below maps
to a distinct code branch — seven vetoes, five weights, one gate, two
payload-only. None is decorative.

There is deliberately **no broad "which mechanism should power this?" question.**
The build guide warns that *"ambiguous phrasing invites overconfidence"* and that
broad questions hide the signals code should weigh separately. The verdict is
composed by code from narrow answers; it is never asked for directly.

### 4.1 Vetoes — `Noul`, seven questions

Each maps to a documented Jev weakness or to an "ordinary code is enough"
condition. Each independently disqualifies Jev when it fires.

| id | judgment | source |
|---|---|---|
| `needs_generation` | Must the feature *produce* new natural-language text as its output, rather than judge or select existing text? | *"Jev-1.13 is not trained to generate text."* |
| `needs_arithmetic` | Does it require counting, tallying, or arithmetic over a collection? | *"recognizes the shape of an answer rather than tallying"* |
| `needs_temporal_reasoning` | Does it require comparing dates, computing durations, or checking time windows? | *"Jev reads dates as text, not as ordered quantities"* |
| `needs_numeric_comparison` | Does it require judging magnitude or proximity between numeric values? | documented weakness on numeric representations |
| `needs_multihop_reasoning` | Does reaching the answer require several dependent inference steps, planning, or tool use? | *"multiple hops of reasoning"* lower accuracy |
| `untrusted_input` | Does the text being judged come from an adversarial or public source that may contain injected instructions? | *"doesn't treat state as hostile"* |
| `deterministic_rule_exists` | Could an exact rule, lookup table, or pattern match decide this without language understanding? | *"Code owns control flow"* |

### 4.2 Shape and weight — five questions

| id | primitive | judgment |
|---|---|---|
| `output_shape` | Choice | closed set of known options / free prose / a degree or number / a structured record / an action plus parameters / **unclear from the description** |
| `repeated_at_volume` | Noul | Is this judgment made repeatedly across many items, rather than once or rarely? |
| `latency_sensitive` | Noul | Does it sit in an interactive or real-time path? |
| `high_consequence` | Noul | Would a wrong answer cause material harm — money, safety, legal exposure, or an irreversible action? |
| `semantic_depth` | Score | exact match suffices → phrasing and synonyms → context and intent → nuanced domain judgment |

`output_shape` carries an explicit no-match option. A missing option forces a
wrong answer.

### 4.3 Gate — one question

| id | primitive | judgment |
|---|---|---|
| `description_specificity` | Score | How concretely does the description pin down the input, the output, and the decision being made? Levels run from "names a domain only" to "states input, output shape, and the decision rule". |

### 4.4 Speculative payload — two questions

Consumed only when Jev survives the vetoes; ignored otherwise. Stating the
premise explicitly and discarding inapplicable answers is the documented fan-out
behaviour.

| id | primitive | judgment |
|---|---|---|
| `primitive_fit` | Choice | Choice / Noul / Score / a combination / none fits |
| `pattern_fit` | Choice | speculative fan-out / confidence-gated routing / composite scoring / intent routing / none fits |

**These two must carry their own definitions in `criteria`.** Jev cannot be
assumed to know TypeSafe's API from its weights — *"Never rely on model weights
for information your code already possesses."* Each option is supplied as a
structured object giving what it covers, what it is not for, and a concrete
example, following the contrastive-criteria guidance in the build guide.

### 4.5 State

A single JSON object. Fields:

- `feature_description` — the visitor's text, explicitly labelled as untrusted
  third-party input.
- `primitive_definitions` and `pattern_definitions` — supplied by code, for the
  §4.4 questions.

Nothing else. Large state with irrelevant detail *"acts as a distractor"* and
reduces accuracy, so the state stays minimal by design, not only for cost.

---

## 5. Composition — code owns the verdict

### 5.1 Probabilities are not cross-comparable

The jaggedness page states that Noul and Choice probabilities are not directly
comparable, and that *"P(noul) and 1 - P(not noul) may not be directly
comparable."*

Therefore: **code never sums raw probabilities across primitive types.** Each
Noul is first thresholded into a band (`fires` / `uncertain` / `does not fire`),
and the weighted composite operates on bands and `Score` levels only.

**A Noul has no separate confidence field** — its probability *is* the signal, and
a value near 0.5 means "as likely yes as no", not "medium intensity". So the two
primitive types are banded by different quantities, and the code must not confuse
them:

- **Noul** → band on the returned probability.
- **Choice / Score** → band on `confidence`, which summarizes distribution
  concentration.

The §5.3 numbers apply to both, but to different fields.

### 5.2 Order of evaluation

1. **Specificity gate.** If `description_specificity` is at its lowest level,
   emit **Not enough to judge** and stop. This check runs first and depends on
   nothing else.
2. **Vetoes.** Any veto in `fires` state disqualifies Jev and selects the
   corresponding alternative verdict. Vetoes are evaluated before any weighting;
   a strong fit score cannot outvote "Jev cannot generate text".
3. **Composite.** Whatever survives is scored for Jev-fit from `semantic_depth`,
   `output_shape`, `repeated_at_volume`, and `latency_sensitive`.
4. **Consequence adjustment.** `high_consequence` does not change the verdict —
   it raises the bar required to state it, per §5.3.
5. **Floor check on consumed answers only.** An answer is "deciding" once steps
   2–3 have actually consumed it. If any deciding answer sits below the floor,
   the verdict degrades to **Not enough to judge**, naming that dimension.
   Speculative answers on discarded branches are ignored regardless of their
   values — uncertainty on a branch nobody took is not a reason to withhold a
   verdict.

The floor check is deliberately last: which answers matter is not knowable until
composition has run, so it cannot be part of the opening gate.

Weights and thresholds live in code as named constants, tunable without
re-running inference. Changing a weight must never require a new Jev call.

### 5.3 Confidence gating

Two documented sets of bands exist and they differ. `confidence.md` gives >0.9
act / 0.5–0.9 confirm / <0.5 human. The worked `patterns/confidence-routing`
page is looser: a universal floor of **0.6**, low-consequence action at
**≥0.6**, high-consequence confirmation in **0.6–0.85**, and action above
**0.85**.

**This spec adopts the pattern page's bands**, chosen deliberately rather than by
default. Prior experience on a real integration is that picking 0.90/0.95 without
reading the pattern page sends a large share of correct answers to review for no
gain.

Applied here:

- Below **0.6** on a deciding answer (§5.2 step 5) → **Not enough to judge**.
- `high_consequence` fires and the verdict sits in **0.6–0.85** → the card states
  the verdict as provisional and names what would confirm it.
- Otherwise → state the verdict plainly.

### 5.4 Verdict outcomes

- **Just write code** — a deterministic rule covers it.
- **Jev fits** — repeated, semantic, closed-shape judgment.
- **Use an LLM** — generation, multi-hop reasoning, or open-ended output.
- **Jev + LLM** — Jev gates or verifies, the LLM generates.
- **Classical ML** — high volume, labelled outcomes, no language understanding
  needed.
- **Not enough to judge** — a first-class outcome, not an error state. It is what
  makes the other five credible.

---

## 6. Architecture

- **Next.js** (App Router) deployed on **Vercel**.
- One server route, `POST /api/verdict`. The TypeSafe key is server-side only and
  never reaches the browser.
- **KV** (Vercel KV / Upstash) for rate limiting and result caching.
- `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer <key>`,
  body `{ model, state, questions }`. Retry `429` / `529` / 5xx with backoff.
  `401` and `422` are terminal and must surface as errors, never as an empty
  verdict.
- The model version is **pinned**, not `latest`, because the jaggedness profile
  the vetoes encode is version-specific. The exact accepted model identifier is
  an open question (§9).

### Caching and permalinks

The description is normalized (trim, collapse whitespace, lowercase) and hashed.
The hash is both the cache key and the permalink id, so identical ideas cost one
inference and every verdict is shareable at `/v/<hash>`. Cached entries record
the model version; a version change invalidates them, since the vetoes are tied
to that version's weaknesses.

---

## 7. Abuse, cost, and accepted risk

- **Rate limit by IP** at the route.
- **Input length cap.** This is a correctness measure before it is a cost
  measure: irrelevant detail acts as a distractor and degrades accuracy.
  Over-length input is rejected with an explanation, never silently truncated.
- **Prompt injection is an accepted, disclosed risk.** The state box is public
  and Jev does not treat state as hostile. Someone will submit text instructing a
  favourable verdict. Mitigations: the description is structurally labelled as
  untrusted data in state, and *Show your work* makes any manipulation visible
  rather than hidden. Detecting injection attempts as an explicit judgment is a
  v1 candidate, not a v0 promise.
- **No absolute cost claims**, per §2.

---

## 8. Testing

The composition layer is deterministic given a set of answers. That boundary is
the test strategy:

- **Golden fixtures.** Roughly 25 hand-labelled descriptions spanning
  obvious-code, obvious-LLM, obvious-Jev, each veto firing in isolation, and
  deliberately ambiguous cases. Their Jev answers are recorded once and
  committed.
- **Offline composition tests** run against those recorded answers. They are free
  and fast, so weights, bands and thresholds can be retuned without spending a
  token.
- **A thin live smoke test** covers the API contract only: one real request,
  asserting the response shape and that every question id comes back.
- **Veto coverage.** Each of the seven vetoes has at least one fixture where it
  fires alone and correctly overrides an otherwise strong Jev-fit score.

---

## 9. Scope and open questions

### v0 — everything above, Jev only

Explanations are composed by code from templates keyed on the answers. No LLM, no
second provider, no generated prose.

### v1 — additive, same judgment layer

An LLM runs strictly downstream, only when the verdict includes Jev, and only to
draft the visitor's concrete question set and a paste-ready snippet. It never
touches the verdict, and the page shows that boundary explicitly. Injection
detection also lands here.

### Open questions

1. **Model identifier.** Local notes record `jev-latest`; the jaggedness page is
   published as `jev-1.13`. The exact string the API accepts for a pinned version
   must be confirmed against `api.md` / `models.md` before implementation.
2. **Domain.** The name is settled (ShouldIJev); the domain is not bought yet.
3. **Score level wording.** The `semantic_depth` and `description_specificity`
   levels must describe concrete situations and stand alone, per the Score
   primitive page. Drafting them is an implementation task.
4. **Threshold tuning.** The §5.3 bands are a documented starting point, not a
   tuned result. They should be re-evaluated against the golden fixtures once
   real answers exist.
