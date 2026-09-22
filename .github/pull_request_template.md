**What this changes, and why**

**If it touches the verdict**

- [ ] The new behaviour is covered in `tests/compose.test.ts`
- [ ] No decision moved out of `lib/compose.ts` and into a question
- [ ] Every new weight or threshold is a named constant

**If it touches `lib/questions.ts` or `lib/state.ts`**

- [ ] Fixtures re-recorded (`npm run record:fixtures`) and diffed
      (`npx tsx scripts/compare-recorded.ts`)
- [ ] Disagreements examined rather than relaxed, and noted below

**Checks**

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] Docs that this change makes wrong are fixed in the same PR
