import type { VerdictKind, VerdictRecord } from "@/lib/verdict";
import type { Answer } from "@/lib/jev/types";

export const OG_SIZE = { width: 1200, height: 630 };

const BG = "#f2efe6";
const LIFT = "#faf8f2";
const LINE = "#d4cdbc";
const TEXT = "#1b1915";
const DIM = "#58534a";
const FAINT = "#8a8375";
const ACCENT = "#c43d23";

/** Same six semantic colours as the app, inlined: Satori cannot read CSS vars. */
export const OG_COLOR: Record<VerdictKind, string> = {
  jev_fits: "#2f7a3c",
  just_write_code: "#1f5c96",
  use_an_llm: "#a86408",
  jev_plus_llm: "#6a47a8",
  classical_ml: "#b0354f",
  not_enough_to_judge: "#7a7466",
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
      {/* A rule in the verdict colour, so the six outcomes are distinguishable in a feed. */}
      <div
        style={{ position: "absolute", top: 0, left: 0, width: OG_SIZE.width, height: 12, background: color }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", fontSize: 19, color: TEXT, letterSpacing: 3, borderBottom: `2px solid ${TEXT}`, paddingBottom: 10 }}>
          SHOULD I JEV? · VERDICT
        </div>
        <div style={{ display: "flex", fontSize: 92, fontFamily: "serif", color, letterSpacing: -1.5 }}>
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
        style={{ position: "absolute", top: 0, left: 0, width: OG_SIZE.width, height: 12, background: ACCENT }}
      />
      <div style={{ display: "flex", fontSize: 104, fontFamily: "serif", color: TEXT, letterSpacing: -2 }}>
        Should I Jev?
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
                border: `1px solid ${OG_COLOR[k]}`,
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
