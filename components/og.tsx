import type { VerdictKind, VerdictRecord } from "@/lib/verdict";
import type { Answer } from "@/lib/jev/types";

export const OG_SIZE = { width: 1200, height: 630 };

const BG = "#0a0a0b";
const LIFT = "#121214";
const LINE = "#24242a";
const TEXT = "#ededf0";
const DIM = "#8f8f9a";
const FAINT = "#5d5d68";

/** Same six semantic colours as the app, inlined: Satori cannot read CSS vars. */
export const OG_COLOR: Record<VerdictKind, string> = {
  jev_fits: "#c2f04a",
  just_write_code: "#62d0ff",
  use_an_llm: "#ffb454",
  jev_plus_llm: "#c08bff",
  classical_ml: "#ff7a9c",
  not_enough_to_judge: "#8f8f9a",
};

const GIST: Record<VerdictKind, string> = {
  jev_fits: "A typed judgment is the right tool here.",
  just_write_code: "No model needed. Write the rule.",
  use_an_llm: "This wants a generative model.",
  jev_plus_llm: "Jev decides, the LLM writes.",
  classical_ml: "Train on your labels instead.",
  not_enough_to_judge: "Tell me a little more and I will rule.",
};

/**
 * A strip of real judgments under the verdict, so a shared card shows the tool
 * working rather than only its conclusion. These are the six that most often
 * move the verdict.
 */
const STRIP: [string, string][] = [
  ["needs_generation", "writes text"],
  ["deterministic_rule_exists", "a rule covers it"],
  ["semantic_depth", "language depth"],
  ["repeated_at_volume", "at volume"],
  ["output_shape", "output"],
  ["untrusted_input", "public text"],
];

/**
 * A strip cell fits about thirteen characters, and `action_with_parameters`
 * spelled out clips to "action with...". The only choice question in the strip
 * is output_shape, so its options get card-length names.
 */
const SHORT_CHOICE: Record<string, string> = {
  closed_set: "closed set",
  free_prose: "prose",
  degree_or_number: "a number",
  structured_record: "fields",
  action_with_parameters: "an action",
  unclear: "unclear",
};

function reading(a: Answer | undefined): string {
  if (!a) return "-";
  if (a.type === "noul") return a.noul >= 0.6 ? "yes" : a.noul <= 0.4 ? "no" : "either way";
  if (a.type === "score") {
    // The scale comes from the legend, which always carries every level. The
    // probabilities do not: a real answer drops levels with negligible mass,
    // which read as a shrinking scale ("1 of 2" on a four-level question).
    // Levels are zero-indexed, so a reader sees level + 1.
    const levels = Object.keys(a.legend).length;
    return `${Math.round(a.score) + 1} of ${levels}`;
  }
  return SHORT_CHOICE[a.choice] ?? a.choice.replace(/_/g, " ");
}

/** Cuts at a word boundary, so a shared card never ends mid-word. */
export function clamp(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

/** The per-verdict share card. */
export function VerdictCardImage({ record }: { record: VerdictRecord }) {
  const color = OG_COLOR[record.verdict.kind];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG,
        padding: "56px 64px",
        fontFamily: "sans-serif",
      }}
    >
      {/* Tint keyed to the verdict, so the six outcomes are distinguishable in a feed. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          background: `radial-gradient(90% 75% at 0% 0%, ${color}24, ${color}00 62%)`,
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", fontSize: 21, color: FAINT, letterSpacing: 1 }}>
          does it fit jev?
        </div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color, letterSpacing: -2.5 }}>
          {record.verdict.headline}
        </div>
        <div style={{ display: "flex", fontSize: 33, color: TEXT }}>
          {GIST[record.verdict.kind]}
        </div>
        <div style={{ display: "flex", fontSize: 25, color: DIM, lineHeight: 1.45, maxWidth: 1000 }}>
          {clamp(record.description, 150)}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", gap: 10 }}>
          {STRIP.map(([id, label]) => (
            <div
              key={id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 7,
                flex: 1,
                background: LIFT,
                border: `1px solid ${LINE}`,
                borderRadius: 12,
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", fontSize: 16, color: FAINT }}>{label}</div>
              <div style={{ display: "flex", fontSize: 21, color: TEXT }}>
                {clamp(reading(record.work.answers[id]), 13)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 18, color: FAINT }}>
          19 typed judgments, one request, composed in code
          {record.verdict.provisional ? " · stated as provisional" : ""}
        </div>
      </div>
    </div>
  );
}

/** The default card, for the home page and anything without a verdict. */
export function DefaultCardImage() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 26,
        background: BG,
        padding: "0 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          background: `radial-gradient(90% 80% at 0% 0%, ${OG_COLOR.jev_fits}22, ${OG_COLOR.jev_fits}00 60%)`,
        }}
      />
      <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: TEXT, letterSpacing: -3 }}>
        Does it fit Jev?
      </div>
      <div style={{ display: "flex", fontSize: 34, color: DIM, lineHeight: 1.4, maxWidth: 930 }}>
        Describe a feature. Watch 19 typed judgments resolve, and get a verdict on what should
        actually power it.
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        {(["jev_fits", "just_write_code", "use_an_llm", "not_enough_to_judge"] as VerdictKind[]).map(
          (k) => (
            <div
              key={k}
              style={{
                display: "flex",
                fontSize: 21,
                color: OG_COLOR[k],
                border: `1px solid ${OG_COLOR[k]}59`,
                borderRadius: 999,
                padding: "9px 20px",
              }}
            >
              {k === "jev_fits" ? "Jev fits" : k === "just_write_code" ? "Just write code" : k === "use_an_llm" ? "Use an LLM" : "Not enough to judge"}
            </div>
          ),
        )}
      </div>
      <div style={{ display: "flex", fontSize: 20, color: FAINT, marginTop: 6 }}>
        It says no. That is the point.
      </div>
    </div>
  );
}
