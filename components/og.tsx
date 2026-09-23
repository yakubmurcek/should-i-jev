import type { VerdictKind, VerdictRecord } from "@/lib/verdict";
import type { Answer } from "@/lib/jev/types";

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The site's own face, so a shared card matches the page. Satori only reads
 * static TTF/WOFF (not woff2, not variable fonts), hence the two files.
 * Traced into the og routes by next.config.mjs.
 */
export async function ogFonts() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const dir = join(process.cwd(), "assets/fonts");
  const [regular, heavy] = await Promise.all([
    readFile(join(dir, "bricolage-500.woff")),
    readFile(join(dir, "bricolage-800.woff")),
  ]);
  return [
    { name: "Bricolage", data: regular, weight: 500 as const, style: "normal" as const },
    { name: "Bricolage", data: heavy, weight: 800 as const, style: "normal" as const },
  ];
}

const BG = "#0f0f0f";
const TEXT = "#f6f2e9";
const DIM = "#aaa59b";
const INK = "#0f0f0f";
const ACCENT = "#ffd23f";

/** Same six semantic colours as the app, inlined: Satori cannot read CSS vars. */
export const OG_COLOR: Record<VerdictKind, string> = {
  jev_fits: "#3ddc84",
  just_write_code: "#5aa9ff",
  use_an_llm: "#ff9a3c",
  jev_plus_llm: "#b08cff",
  classical_ml: "#ff5f8f",
  not_enough_to_judge: "#c9c4b8",
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

/** The per-verdict share card: the verdict as one solid block of its colour, so it stops a feed. */
export function VerdictCardImage({ record }: { record: VerdictRecord }) {
  const color = OG_COLOR[record.verdict.kind];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        background: BG,
        padding: 36,
        fontFamily: "Bricolage",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          background: color,
          borderRadius: 36,
          padding: "40px 48px",
          color: INK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", fontSize: 120, fontWeight: 800, letterSpacing: -5, lineHeight: 1 }}>
            {record.verdict.headline}
          </div>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 800 }}>{GIST[record.verdict.kind]}</div>
          <div style={{ display: "flex", fontSize: 25, lineHeight: 1.4, maxWidth: 1000, opacity: 0.72 }}>
            {clamp(record.description, 130)}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {STRIP.map(([id, label]) => (
            <div
              key={id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                flex: 1,
                background: INK,
                borderRadius: 16,
                padding: "11px 14px",
              }}
            >
              <div style={{ display: "flex", fontSize: 15, color: DIM }}>{label}</div>
              <div style={{ display: "flex", fontSize: 21, color }}>{clamp(reading(record.work.answers[id]), 13)}</div>
            </div>
          ))}
        </div>
      </div>
      <Footer provisional={record.verdict.provisional} />
    </div>
  );
}

function Footer({ provisional, named = true }: { provisional?: boolean; named?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
      {named ? (
      <div
        style={{
          display: "flex",
          background: ACCENT,
          color: INK,
          fontSize: 24,
          fontWeight: 800,
          borderRadius: 10,
          padding: "4px 12px",
          transform: "rotate(-2deg)",
        }}
      >
        should i jev?
      </div>
      ) : (
        <div style={{ display: "flex" }} />
      )}
      <div style={{ display: "flex", fontSize: 22, color: DIM }}>
        {provisional ? "provisional · " : ""}19 checks, 1 request · by @ykbmck
      </div>
    </div>
  );
}

/** The default card, for the home page and anything without a verdict. */
export function DefaultCardImage() {
  const kinds: [VerdictKind, string][] = [
    ["just_write_code", "Just write code"],
    ["classical_ml", "Classical ML"],
    ["jev_fits", "Jev fits"],
    ["use_an_llm", "Use an LLM"],
  ];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG,
        padding: "64px 72px 44px",
        fontFamily: "Bricolage",
        color: TEXT,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, fontSize: 150, fontWeight: 800, letterSpacing: -7, lineHeight: 1 }}>
          Should I
          <div
            style={{
              display: "flex",
              background: ACCENT,
              color: INK,
              borderRadius: 18,
              padding: "0 18px 8px",
              transform: "rotate(-2deg)",
            }}
          >
            Jev?
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: DIM, marginTop: 18, maxWidth: 1000 }}>
          Is your feature a job for Jev, the typed-judgment model?
        </div>
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        {kinds.map(([k, label]) => (
          <div
            key={k}
            style={{
              display: "flex",
              flex: 1,
              background: OG_COLOR[k],
              color: INK,
              fontSize: 27,
              fontWeight: 800,
              borderRadius: 20,
              padding: "26px 22px",
            }}
          >
            {label}
          </div>
        ))}
      </div>
      <Footer named={false} />
    </div>
  );
}
