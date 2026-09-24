import type { VerdictKind, VerdictRecord } from "@/lib/verdict";
import type { Answer } from "@/lib/jev/types";
import { STAMP } from "@/components/verdict-meta";

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
const LIFT = "#1a1a1a";
const LINE = "#2e2e2e";
const SITE = "shouldijev.vercel.app";

/** Same six semantic colours as the app, inlined: Satori cannot read CSS vars. */
export const OG_COLOR: Record<VerdictKind, string> = {
  jev_fits: "#3ddc84",
  just_write_code: "#5aa9ff",
  use_an_llm: "#ff9a3c",
  jev_plus_llm: "#b08cff",
  classical_ml: "#ff5f8f",
  not_enough_to_judge: "#c9c4b8",
};


/**
 * A strip of real judgments under the verdict, so a shared card shows the tool
 * working rather than only its conclusion. These are the four that most often
 * move the verdict.
 */
const STRIP: [string, string][] = [
  ["needs_generation", "writes text"],
  ["deterministic_rule_exists", "a rule covers it"],
  ["semantic_depth", "language depth"],
  ["output_shape", "output"],
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

/** The name as a tilted sticker, same as the site's masthead. */
function Sticker({ size = 26 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        background: ACCENT,
        color: INK,
        fontSize: size,
        fontWeight: 800,
        borderRadius: 10,
        padding: "4px 14px",
        transform: "rotate(-3deg)",
      }}
    >
      should i jev?
    </div>
  );
}

/** Long headlines ("Not enough to judge") step down so they stay on one line. */
function headlineSize(h: string): number {
  if (h.length <= 10) return 132;
  if (h.length <= 14) return 112;
  return 76;
}

/**
 * The per-verdict share card: the feature on top as the question, the verdict
 * slapped under it as a tilted stamp in its own colour, so it stops a feed.
 */
export function VerdictCardImage({ record }: { record: VerdictRecord }) {
  const color = OG_COLOR[record.verdict.kind];
  const { headline, sub } = STAMP[record.verdict.kind];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        padding: "40px 56px 52px",
        fontFamily: "Bricolage",
        color: TEXT,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Sticker />
        <div style={{ display: "flex", fontSize: 24, color: DIM }}>{SITE}</div>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 36, alignItems: "flex-start" }}>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, color: ACCENT, lineHeight: 0.8, marginTop: 4 }}>
          “
        </div>
        <div style={{ display: "flex", fontSize: 42, fontWeight: 500, lineHeight: 1.25, maxWidth: 1000 }}>
          {clamp(record.description, 100)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: "auto",
          background: color,
          color: INK,
          borderRadius: 32,
          padding: "26px 40px 30px",
          transform: "rotate(-1.5deg)",
          boxShadow: `10px 10px 0 ${ACCENT}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 800, letterSpacing: 3, opacity: 0.6 }}>
              {record.verdict.provisional ? "PROVISIONAL VERDICT" : "VERDICT"}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: headlineSize(headline),
                fontWeight: 800,
                letterSpacing: -4,
                lineHeight: 1,
              }}
            >
              {headline}
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, marginTop: 6 }}>
              {sub}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 300, flexShrink: 0 }}>
            {STRIP.map(([id, label]) => (
              <div
                key={id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  background: INK,
                  borderRadius: 12,
                  padding: "7px 14px",
                  fontSize: 19,
                }}
              >
                <div style={{ display: "flex", color: DIM }}>{label}</div>
                <div style={{ display: "flex", color, fontWeight: 800 }}>
                  {clamp(reading(record.work.answers[id]), 13)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The default card, for the home page and anything without a verdict. */
export function DefaultCardImage() {
  // Fanned like stickers on a laptop lid, each at its own tilt.
  const stickers: [VerdictKind, string, number, number, number][] = [
    ["jev_fits", "Jev fits", 700, 250, -6],
    ["just_write_code", "Just write code", 820, 340, 4],
    ["use_an_llm", "Use an LLM", 690, 430, 3],
    ["classical_ml", "Classical ML", 880, 470, -5],
  ];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BG,
        padding: "56px 64px 44px",
        fontFamily: "Bricolage",
        color: TEXT,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", fontSize: 140, fontWeight: 800, letterSpacing: -7, lineHeight: 0.95 }}>
        <div style={{ display: "flex" }}>Should I</div>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              background: ACCENT,
              color: INK,
              borderRadius: 22,
              padding: "0 22px 10px",
              marginTop: 10,
              transform: "rotate(-3deg)",
            }}
          >
            Jev?
          </div>
        </div>
      </div>
      <div style={{ display: "flex", fontSize: 30, color: DIM, marginTop: 34, maxWidth: 560, lineHeight: 1.3 }}>
        Describe a feature. Find out if it needs Jev, an LLM, or just code.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: "auto",
          width: 600,
          background: LIFT,
          border: `2px solid ${LINE}`,
          borderRadius: 18,
          padding: "10px 10px 10px 24px",
          fontSize: 24,
        }}
      >
        <div style={{ display: "flex", color: DIM }}>{SITE}</div>
        <div style={{ display: "flex", background: ACCENT, color: INK, fontWeight: 800, borderRadius: 12, padding: "8px 18px" }}>
          Judge it →
        </div>
      </div>

      {stickers.map(([k, label, x, y, deg]) => (
        <div
          key={k}
          style={{
            display: "flex",
            position: "absolute",
            left: x,
            top: y,
            background: OG_COLOR[k],
            color: INK,
            fontSize: 34,
            fontWeight: 800,
            borderRadius: 18,
            padding: "18px 26px",
            transform: `rotate(${deg}deg)`,
            boxShadow: `6px 6px 0 ${INK}`,
          }}
        >
          {label}
        </div>
      ))}
      <div style={{ display: "flex", position: "absolute", right: 64, top: 64, fontSize: 22, color: DIM }}>
        by @ykbmck
      </div>
    </div>
  );
}
