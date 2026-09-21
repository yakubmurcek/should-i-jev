/**
 * Replaces the hand-authored answers in tests/fixtures.ts with real recorded
 * ones — §8's "their Jev answers are recorded once and committed".
 *
 *   TYPESAFE_API_KEY=... npx tsx scripts/record-fixtures.ts
 *
 * One request per fixture description (one subject per request; the fifteen
 * questions ride along inside it). Writes tests/recorded-answers.json, which
 * fixtures.ts picks up when present. Recorded answers that disagree with the
 * hand-authored expectation are a finding to examine, not a test to relax.
 */
import { writeFileSync } from "node:fs";
import { askJev, MODEL } from "../lib/jev/client";
import { QUESTIONS } from "../lib/questions";
import { buildState } from "../lib/state";
import { FIXTURES } from "../tests/fixtures";

async function main() {
  const out: Record<string, unknown> = { model: MODEL, recordedAt: new Date().toISOString(), byFixture: {} };
  const byFixture = out.byFixture as Record<string, unknown>;

  for (const f of FIXTURES) {
    process.stderr.write(`recording ${f.id}... `);
    const res = await askJev({ state: buildState(f.description), questions: QUESTIONS });
    byFixture[f.id] = { description: f.description, model: res.model, answers: res.answers };
    process.stderr.write("ok\n");
  }

  writeFileSync("tests/recorded-answers.json", JSON.stringify(out, null, 2) + "\n");
  process.stderr.write(`\nwrote tests/recorded-answers.json (${FIXTURES.length} fixtures)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
