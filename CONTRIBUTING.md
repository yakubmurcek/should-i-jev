# Contributing

Thanks for looking. This is a small, opinionated tool; the bar for a change is
that it makes the verdict more honest, not that it makes more features exist.

## Setup

```bash
npm install
cp .env.example .env.local   # add TYPESAFE_API_KEY
npm run dev                  # http://localhost:3000
```

A key is only needed to produce a *new* verdict. The whole test suite runs
offline.

## Before you open a PR

```bash
npm run typecheck
npm test
```

Both run in CI on every pull request, along with `npm run build`.

## Where changes belong

The one rule that shapes this codebase: **Jev is never asked which mechanism
should power the feature.** It answers nineteen narrow questions and
`lib/compose.ts` composes the verdict from them in plain code.

So:

| you want to change | edit | and |
|---|---|---|
| a weight, a band, a threshold | `lib/bands.ts`, `lib/compose.ts` | add a case to `tests/compose.test.ts` |
| what gets asked | `lib/questions.ts` | re-record fixtures, see below |
| what the model sees | `lib/state.ts` | keep it small; irrelevant detail *reduces* accuracy |
| the surface | `components/` | |

**Never move a decision from code into a question.** A broader question invites
overconfidence and hides signals that code should weigh separately.

Every weight and threshold is a named constant. Retuning one must not require a
new Jev call.

## Touching the questions

Question changes shift real answers, so hand-authored expectations go stale.

```bash
npm run record:fixtures            # real answers, needs a key and spends tokens
npx tsx scripts/compare-recorded.ts # diff them against tests/fixtures.ts
```

Where a recorded answer disagrees with the hand-authored one, that is a finding
to examine, not a test to relax. The README's "What the first recording found"
section is what this loop is for — every entry there came out of a diff.

## Commits

Present tense, one concern per commit, and a body that says *why* where the
subject cannot. If a change makes something in `README.md` or `docs/` wrong, fix
it in the same commit.
