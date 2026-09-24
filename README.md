<h1 align="center">Should I Jev?</h1>

<p align="center">
  Describe a feature in one box. Get a verdict on what should actually power it —
  <br />
  plain code, <a href="https://typesafe.ai">Jev</a>, an LLM, Jev + LLM, classical ML, or "not enough to judge".
</p>

<p align="center">
  <a href="https://shouldijev.vercel.app"><strong>Try it live → shouldijev.vercel.app</strong></a>
</p>

<p align="center">
  <a href="https://github.com/yakubmurcek/should-i-jev/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/yakubmurcek/should-i-jev/actions/workflows/ci.yml/badge.svg" /></a>
  <img alt="License MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" />
  <img alt="Next.js 15" src="https://img.shields.io/badge/Next.js-15-black.svg" />
  <img alt="model jev-1.13.0" src="https://img.shields.io/badge/model-jev--1.13.0-a3e635.svg" />
</p>

<p align="center">
  <img src="docs/screenshots/02-verdict-full.png" alt="Nineteen typed judgments resolving into a 'Jev fits' verdict for support-email routing" width="820" />
</p>

## It is willing to say no

A recommender that always recommends Jev is worthless to a developer. "Just
write code" is a real answer here, and the most common one.

<p align="center">
  <img src="docs/screenshots/03-says-no.png" alt="The same tool answering 'Just write code' for a country-code to currency lookup" width="820" />
</p>

TypeSafe publishes what Jev is good at, and — on a page absent from `llms.txt` —
what it is bad at. Both halves exist as prose, and nobody runs them against
*your* feature. That is the product: **an executable reading of TypeSafe's own
jaggedness list, applied to a described idea.**

## Run it

```bash
git clone https://github.com/yakubmurcek/should-i-jev.git
cd should-i-jev
npm install
cp .env.example .env.local   # add TYPESAFE_API_KEY
npm run dev                  # http://localhost:3000
```

A key is only needed to produce a *new* verdict — the entire test suite runs
offline. Permalinks work without KV configured; the dev fallback store is shared
across module instances on purpose, because Next gives route handlers and server
components separate ones and a plain module-scope Map 404s every `/v/<hash>`.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyakubmurcek%2Fshould-i-jev&env=TYPESAFE_API_KEY&envDescription=Your%20TypeSafe%20API%20key%2C%20server-side%20only)

## How it works

One request to Jev carries nineteen questions about one subject, evaluated in
parallel — the documented speculative fan-out pattern. **Jev is never asked
which mechanism should power the feature.** Broad questions invite
overconfidence and hide the signals code should weigh separately, so the nineteen
answers are narrow and `lib/compose.ts` composes the verdict from them:

1. **Specificity gate** — a subject area is not a decision. Stop.
2. **Seven vetoes**, before any weighting. A strong fit score cannot outvote
   "Jev cannot generate text". A veto rules Jev out; it does not rule code in.
   When it fired on a quantity and you already have labelled outcomes at
   volume, the fallback is a trained model, not an `if`. A date or magnitude
   veto with no exact rule behind it is a prediction, so it never falls back to
   code. And when the output is written prose, a schedule or a count around it
   does not decide anything: the writing is the job.
3. **Composite** over banded answers and score levels.
4. **Consequence adjustment** — high consequence does not change the verdict, it
   raises the bar required to state it.
5. **Floor check on consumed answers only, and only where it matters** —
   uncertainty on a branch nobody took is not a reason to withhold a verdict,
   and neither is uncertainty whose plausible resolutions all rule the same
   way. Options carrying under 10 % of the mass are rounding, not alternatives.

Two rules the code holds to throughout:

- **Probabilities are never summed across primitive types.** A Noul and a Choice
  are not on one scale. Every answer is banded first (`lib/bands.ts`), and the
  two types are banded by *different quantities*: a Noul on its probability
  (it has no `confidence` field — its probability *is* the signal), a Choice or
  Score on `confidence`.
- **Every weight and threshold is a named constant in code.** Retuning one must
  never require a new Jev call.

Nothing is hidden. Every verdict ships the exact state sent, every question
asked, and every answer returned:

<p align="center">
  <img src="docs/screenshots/05-show-your-work.png" alt="The 'Show your work' panel, displaying the raw state and questions sent to Jev" width="820" />
</p>

Shared links carry a rendered card with the real judgments on it:

<p align="center">
  <img src="docs/screenshots/04-share-card.png" alt="The generated share card for a 'Just write code' verdict" width="640" />
</p>

## Layout

| path | what |
|---|---|
| `lib/questions.ts` | the nineteen questions, with contrastive criteria |
| `lib/state.ts` | the state, kept small — irrelevant detail *reduces accuracy* |
| `lib/bands.ts` | banding and the confidence floors |
| `lib/compose.ts` | the verdict, owned by code |
| `lib/jev/client.ts` | one request, retry on 429/529/5xx, terminal on 401/422 |
| `app/api/verdict/route.ts` | per-IP limit, global daily cap, length cap, cache, compose |
| `components/Studio.tsx` | the one-box surface: describe, submit, watch the judgments resolve |
| `components/VerdictBanner.tsx` | the verdict headline and its gist |
| `components/JudgmentGrid.tsx` | all nineteen answers, grouped |
| `components/VerdictDetails.tsx` | deciding judgments, assumptions, what would change it |
| `components/og.tsx` | the share card, rendered to PNG by Satori |

The full design is
[`docs/superpowers/specs/2026-09-20-jev-fit-design.md`](docs/superpowers/specs/2026-09-20-jev-fit-design.md).

## Tests

The composition layer is deterministic given a set of answers, and that boundary
is the test strategy.

```bash
npm test          # offline: 27 golden fixtures + card rendering. Free, no key.
npm run test:live # one real request, contract only. Needs TYPESAFE_API_KEY.
```

`npm test` covers every verdict outcome and every one of the seven vetoes firing
in isolation against an otherwise strong Jev-fit score. Weights, bands and
thresholds can be retuned and re-verified without spending a token.

**The fixture answers in `tests/fixtures.ts` are hand-authored, not recorded.**
`npm run record:fixtures` fetches real answers for the same descriptions and
`npx tsx scripts/compare-recorded.ts` diffs them. Where a recorded answer
disagrees with the hand-authored one, that is a finding to examine, not a test to
relax.

## What recording real answers found

Run against live `jev-1.13.0`, the hand-authored expectations matched **6 of 27**.
Three defects came out of that, all fixed here:

1. **`untrusted_input` fired at 0.94 mean, range 0.79-0.97 — on everything**,
   including a country-code lookup. Cause, isolated in a 2x2: the model was
   reading the question against the state's own "untrusted third-party input"
   label and answering about *the description's* provenance, not the feature's
   runtime input. Naming the runtime explicitly moved the lookup to 0.24 while a
   public vendor-application form held at 0.89. Literal reading, exactly as the
   jaggedness page warns — and caused by our own security label.
2. **`untrusted_input` as a standalone veto ruled out the canonical case.**
   Support-email routing scores 0.88 there, because customers *are* the public.
   It is now conditional on `high_consequence`: being steered into a reversible
   label is an annoyance, being steered into a payout is the documented risk.
3. **Score confidence was read like Choice confidence.** A depth of 2.2 spread
   across levels 2 and 3 is "between these two" on an *ordered* scale, not
   ignorance. Score certainty is now adjacent-level mass.

A fourth fix came from the same data: an answer below the floor now withholds the
verdict only if resolving it either way would actually change it. Without that,
`latency_sensitive` — the smallest weight there is, and near 0.5 on most real
descriptions — withheld verdicts its own resolution could not have altered.

After the fixes: **14 of 28**.

## Audited against TypeSafe's own docs

Read against `concepts/state`, `primitives/noul`, `confidence`, `patterns/fan-out`
and the `parallel_questions` cookbook. What the audit changed:

- **Batching is already right.** The cookbook measures one batched call at
  **12.2x cheaper and 10.0x faster** than sequential ones with no change in
  answers. We send one request per subject carrying every question.
- **Cost is the question set, not the state.** Measured: 2,806 input tokens per
  request, of which the state is ~90. Noul `criteria` are 687 of those tokens —
  the docs say to try questions with and without them, so we did: without, answers
  move *toward* 0.5 (`deterministic_rule_exists` 0.15 -> 0.23). Bands are what the
  code consumes, so sharper answers mean fewer withheld verdicts. Criteria stay.
- **A compound Noul was breaking the obvious cases.** The Noul page says to split
  compound questions and combine in code. `needs_multihop_reasoning` bundled
  "dependent steps OR a plan OR tool use" and scored **0.75 on a country-code
  lookup**, vetoing it to "use an LLM". Split, the same case is dependent-steps
  0.22 and external-lookup 0.94 — and needing a lookup is not a reasoning
  weakness, so it is now an architecture note, never a veto. **This single fix
  moved agreement from 14/28 to 19/28.**
- **Backticked state paths: measured, no effect.** The docs recommend referencing
  nested state with backticked paths. With one obvious text field, adding them
  changed 1 band in 35, so they are not used.
- **Classical ML was being selected without the thing that defines it.** §5.4
  calls it "high volume, labelled outcomes, no language understanding" — the
  composite tested volume and depth and assumed the labels. `labelled_outcomes_exist`
  is now asked, and required.
- **Prose output can no longer be outvoted.** Weighting could previously reach
  "Jev fits" on a prose output if depth and volume were high enough. Jev does not
  return prose at all, so no weighting rescues it.

Nineteen questions, 2,872 input tokens per request (+2.4% for the two added
questions), one request per verdict, cached by content hash. The cache keeps
Jev's answers; the verdict is recomposed from them on every read, so a fix to
composition reaches links that were already shared.

### `untrusted_input` is not a veto

Held as one it ruled out every job that reads public text — support routing,
listing moderation, payout-fraud review — and told you to "just write code" for
work code cannot do. The jaggedness page says Jev "doesn't treat state as
hostile"; the documented remedy for that is confidence-gated routing, not
avoidance. So it never changes WHICH mechanism fits. It marks the verdict
provisional, says so on the card, and says what to do about it: keep the
decision reversible, and put a person on it when a wrong answer costs money.

Agreement between recorded answers and the hand-authored expectations, in order:
**6/27 -> 14/28 -> 19/28 -> 27/28.** The one standing divergence is
`floor-uncertain-veto`, whose description now draws a confident answer from the
real model, so it no longer exercises the uncertain-veto branch live; the offline
unit tests still cover that branch directly. The remaining gap is not the system
disagreeing with itself; it is fixture descriptions that trip vetoes I did not
intend (an insurance example that says "incident date" fires
`needs_temporal_reasoning` at 0.91) plus threshold tuning against real answers,
which is open question 4 in the spec. Those are the next session's work, and
`scripts/compare-recorded.ts` is how to see them.

## When TypeSafe is busy

`529 system_overloaded` is TypeSafe under load. It is a wait, not a failed
verdict, and the app treats it as one:

- The client retries six times on a full-jitter curve up to 8s a step, roughly
  17s of budget, and honours `Retry-After` when the server sets one. Full jitter
  because every client retrying on the same curve is how an overloaded service
  stays overloaded.
- The route maps it to `code: "busy"` and a plain sentence. **The upstream
  response body never reaches the browser**; it goes to the server log.
- The page keeps your description, says Jev is busy, and retries on its own with
  a visible countdown, backing off 5s, 10s, 20s, 40s, with a "Try again now"
  button throughout.

Set `JEV_ENDPOINT` at a local stub that always returns 529 to see that path
without waiting for a real outage.

## Accepted risks

**Prompt injection.** The state box is public and Jev does not treat its state as
hostile. Someone will submit text instructing a favourable verdict. The
description is structurally labelled as untrusted third-party data, and *Show
your work* makes any manipulation visible rather than hidden. Detecting injection
as an explicit judgment is a v1 candidate, not a v0 promise.

**No cost claims.** TypeSafe publishes no pricing page, so this tool states no
numbers — only relative statements where they are true.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The short version: never move a decision
out of `lib/compose.ts` and into a question, and re-record the fixtures when you
change what gets asked.

## License

MIT. See [LICENSE](LICENSE).
