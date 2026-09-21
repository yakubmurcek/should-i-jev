# jev-fit

A single-page tool. Describe a feature in one box, submit once, get a verdict on
what should power it — plain code, Jev, an LLM, Jev + LLM, classical ML, or
"not enough to judge".

It is deliberately willing to say no. A recommender that always recommends Jev
is worthless to a developer.

TypeSafe publishes what Jev is good at, and — on a page absent from `llms.txt` —
what it is bad at. Both halves exist as prose, and nobody runs them against
*your* feature. That is the product: **an executable reading of TypeSafe's own
jaggedness list, applied to a described idea.**

The full design is `docs/superpowers/specs/2026-09-20-jev-fit-design.md`.

## How it works

One request to Jev carries fifteen questions about one subject, evaluated in
parallel — the documented speculative fan-out pattern. **Jev is never asked
which mechanism should power the feature.** Broad questions invite
overconfidence and hide the signals code should weigh separately, so the fifteen
answers are narrow and `lib/compose.ts` composes the verdict from them:

1. **Specificity gate** — a subject area is not a decision. Stop.
2. **Seven vetoes**, before any weighting. A strong fit score cannot outvote
   "Jev cannot generate text".
3. **Composite** over banded answers and score levels.
4. **Consequence adjustment** — high consequence does not change the verdict, it
   raises the bar required to state it.
5. **Floor check on consumed answers only** — uncertainty on a branch nobody
   took is not a reason to withhold a verdict.

Two rules the code holds to throughout:

- **Probabilities are never summed across primitive types.** A Noul and a Choice
  are not on one scale. Every answer is banded first (`lib/bands.ts`), and the
  two types are banded by *different quantities*: a Noul on its probability
  (it has no `confidence` field — its probability *is* the signal), a Choice or
  Score on `confidence`.
- **Every weight and threshold is a named constant in code.** Retuning one must
  never require a new Jev call.

## Layout

| path | what |
|---|---|
| `lib/questions.ts` | the fifteen questions, with contrastive criteria |
| `lib/state.ts` | the state, kept small — irrelevant detail *reduces accuracy* |
| `lib/bands.ts` | banding and the confidence floors |
| `lib/compose.ts` | the verdict, owned by code |
| `lib/jev/client.ts` | one request, retry on 429/529/5xx, terminal on 401/422 |
| `app/api/verdict/route.ts` | rate limit, length cap, cache, compose |
| `components/VerdictCard.tsx` | headline, why, deciding judgments, assumptions, what would change it, model version, show-your-work |

## Running it

```bash
npm install
cp .env.example .env.local   # add TYPESAFE_API_KEY
npm run dev
```

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

**The fixture answers in `tests/fixtures.ts` are hand-authored, not recorded** —
this repository has never held a TypeSafe key. `npm run record:fixtures` replaces
them with real answers for the same descriptions. Where a recorded answer
disagrees with the hand-authored one, that is a finding to examine, not a test to
relax.

## Accepted risks

**Prompt injection.** The state box is public and Jev does not treat its state as
hostile. Someone will submit text instructing a favourable verdict. The
description is structurally labelled as untrusted third-party data, and *Show
your work* makes any manipulation visible rather than hidden. Detecting injection
as an explicit judgment is a v1 candidate, not a v0 promise.

**No cost claims.** TypeSafe publishes no pricing page, so this tool states no
numbers — only relative statements where they are true.
