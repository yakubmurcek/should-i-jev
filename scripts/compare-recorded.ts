/** Composes verdicts from the RECORDED answers and diffs against the fixture expectations. */
import { readFileSync } from "node:fs";
import { composeVerdict } from "../lib/compose";
import { certaintyOf, bandNoul } from "../lib/bands";
import { FIXTURES } from "../tests/fixtures";
import type { Answer } from "../lib/jev/types";

const rec = JSON.parse(readFileSync("tests/recorded-answers.json", "utf8")) as {
  byFixture: Record<string, { model: string; answers: Record<string, Answer> }>;
};

let agree = 0;
const diffs: string[] = [];

for (const f of FIXTURES) {
  const r = rec.byFixture[f.id];
  if (!r) continue; // fixture added since the last recording
  const v = composeVerdict(r.answers, r.model);
  const ok = v.kind === f.expect;
  if (ok) { agree++; continue; }

  const lines = [`\n✗ ${f.id}`, `   expected ${f.expect}  ->  recorded ${v.kind}`, `   why: ${v.why}`];
  for (const [id, a] of Object.entries(r.answers)) {
    const hand = f.answers[id]!;
    const fmt = (x: Answer) =>
      x.type === "noul" ? `noul ${x.noul.toFixed(2)} (${bandNoul(x.noul)})`
      : x.type === "choice" ? `${x.choice} @${x.confidence.toFixed(2)}`
      : `level ${x.score.toFixed(2)} @${x.confidence.toFixed(2)}`;
    const differs =
      a.type !== hand.type ? true
      : a.type === "noul" ? bandNoul(a.noul) !== bandNoul((hand as typeof a).noul)
      : a.type === "choice" ? a.choice !== (hand as typeof a).choice
      : Math.round(a.score) !== Math.round((hand as typeof a).score) || Math.abs(certaintyOf(a) - certaintyOf(hand)) > 0.25;
    if (differs) lines.push(`     ${id.padEnd(26)} hand ${fmt(hand).padEnd(26)} recorded ${fmt(a)}`);
  }
  diffs.push(lines.join("\n"));
}

console.log(`${agree}/${Object.keys(rec.byFixture).length} recorded verdicts match the hand-authored expectation`);
console.log(diffs.join("\n"));
