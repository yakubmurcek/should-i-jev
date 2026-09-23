"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Link as LinkIcon, XLogo } from "@phosphor-icons/react";
import type { VerdictRecord } from "@/lib/verdict";
import { MAX_DESCRIPTION_CHARS, MIN_DESCRIPTION_CHARS } from "@/lib/state";
import { EXAMPLES, VERDICT_GIST } from "@/components/verdict-meta";
import JudgmentGrid from "@/components/JudgmentGrid";
import VerdictBanner from "@/components/VerdictBanner";
import SharpenPanel from "@/components/SharpenPanel";
import VerdictDetails from "@/components/VerdictDetails";
import NextStep from "@/components/NextStep";

type Phase = "idle" | "running" | "done" | "error";

/** Only warn about the rate limit once it is close enough to actually matter. */
const LOW_REMAINING = 5;

export default function Studio({ initial }: { initial?: VerdictRecord }) {
  const [text, setText] = useState(initial?.description ?? "");
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle");
  const [record, setRecord] = useState<VerdictRecord | null>(initial ?? null);
  const [error, setError] = useState<{ code?: string; message: string; detail?: string } | null>(null);
  const [retryIn, setRetryIn] = useState<number | null>(null);
  /**
   * Verdicts left in this window, from the last response. Only shown once it
   * gets low: a counter on screen from the first visit reads as a paywall, and
   * running out with no warning at all reads as the tool being broken.
   */
  const [remaining, setRemaining] = useState<number | null>(null);
  const attemptRef = useRef(0);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Set after mount: reading window during render makes the server and client
  // disagree on the share href, which is a hydration mismatch on every permalink.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const tooShort = text.trim().length < MIN_DESCRIPTION_CHARS;
  const over = text.length > MAX_DESCRIPTION_CHARS;

  /**
   * A busy upstream is not a failed verdict, it is a wait. TypeSafe returns 529
   * under load; the server already spends a jittered retry budget on it, and if
   * that is not enough the page waits and goes again on its own rather than
   * making the visitor wonder whether their description survived.
   */
  function scheduleRetry(description: string) {
    const seconds = Math.min(5 * 2 ** attemptRef.current, 40);
    attemptRef.current += 1;
    setRetryIn(seconds);
    const tick = setInterval(() => {
      setRetryIn((n) => {
        if (n === null) return null;
        if (n <= 1) {
          clearInterval(tick);
          run(description);
          return null;
        }
        return n - 1;
      });
    }, 1000);
  }

  async function run(description = text) {
    if (description.trim().length < MIN_DESCRIPTION_CHARS || description.length > MAX_DESCRIPTION_CHARS) return;
    setPhase("running");
    setError(null);
    setRetryIn(null);
    setRecord(null);
    requestAnimationFrame(() =>
      resultRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }),
    );

    try {
      const res = await fetch("/api/verdict", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ code: data.code, message: data.error ?? "Something went wrong.", detail: data.detail });
        setPhase("error");
        if (data.code === "busy" && attemptRef.current < 4) scheduleRetry(description);
        return;
      }
      attemptRef.current = 0;
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setRecord(data as VerdictRecord);
      setPhase("done");
      window.history.replaceState(null, "", `/v/${data.id}`);
    } catch {
      setError({ code: "busy", message: "Could not reach the server." , detail: "Your description is safe, nothing was judged." });
      setPhase("error");
      if (attemptRef.current < 4) scheduleRetry(description);
    }
  }

  /**
   * Chips have to leave the visitor with a description that reads like English,
   * not a pile of fragments: each gap frames its phrase as a real sentence.
   */
  function addPhrase(key: "input" | "output" | "basis", phrase: string) {
    const frame =
      key === "input" ? `It reads ${phrase}.`
      : key === "output" ? `It returns ${phrase}.`
      : `It decides by ${phrase}.`;
    const base = text.trim().replace(/[.\s]+$/, "");
    const merged = base ? `${base}. ${frame}` : frame;
    if (merged.length > MAX_DESCRIPTION_CHARS) return;
    setText(merged);
    boxRef.current?.focus();
  }

  async function copyLink() {
    if (!record) return;
    await navigator.clipboard.writeText(`${window.location.origin}/v/${record.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const shareText = record
    ? `"${record.description.slice(0, 90)}${record.description.length > 90 ? "..." : ""}"\n\n→ ${record.verdict.headline}. ${VERDICT_GIST[record.verdict.kind]}`
    : "";

  return (
    <div className="flex flex-col gap-10">
      {/* ---- Input ---- */}
      <div className="flex flex-col gap-3">
        <label htmlFor="feature" className="text-[15px] font-bold">
          Is your feature a Jev job?
        </label>
        <div className="relative rounded-2xl border-2 border-[var(--line)] bg-[var(--bg-lift)] transition focus-within:border-[var(--accent)] focus-within:shadow-[5px_5px_0_var(--accent)]">
          <textarea
            ref={boxRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
            }}
            id="feature"
            rows={3}
            placeholder="Describe one decision your feature makes, in a sentence or two. What goes in, what comes out."
            className="w-full resize-none bg-transparent px-4 py-4 text-base leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--faint)] focus-visible:outline-none sm:px-5 sm:text-lg"
          />
          <div className="flex items-center justify-between gap-3 border-t-2 border-[var(--line-soft)] py-2 pl-4 pr-2 sm:pl-5">
            <span
              className="font-mono text-[12px] tabular-nums"
              style={{ color: over ? "var(--v-ml)" : "var(--faint)" }}
            >
              {text.length}/{MAX_DESCRIPTION_CHARS}
            </span>
            {remaining !== null && remaining <= LOW_REMAINING && (
              <span className="text-[12px] text-[var(--dim)]">
                {remaining === 0
                  ? "No verdicts left for a few minutes"
                  : `${remaining} ${remaining === 1 ? "verdict" : "verdicts"} left in this ten minutes`}
              </span>
            )}
            <button
              type="button"
              onClick={() => run()}
              disabled={tooShort || over || phase === "running"}
              className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[15px] font-extrabold text-[var(--accent-ink)] shadow-[3px_3px_0_var(--text)] transition enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 enabled:active:shadow-none disabled:opacity-30 disabled:shadow-none"
            >
              {phase === "running" ? "Judging" : "Judge it"}
              <ArrowRight size={15} weight="bold" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
          <span className="mr-1 text-[14px] text-[var(--faint)]">or try</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setText(ex.text);
                run(ex.text);
              }}
              className="rounded-full border-2 border-[var(--line)] px-3 py-1 font-medium text-[var(--dim)] transition hover:-rotate-1 hover:border-[var(--accent)] hover:text-[var(--text)] active:scale-[0.97]"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      {/* ---- Result ---- */}
      <div ref={resultRef} className="scroll-mt-6">
        <AnimatePresence mode="wait">
          {phase === "error" && error && (
            <motion.div
              key="error"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4 rounded-2xl border-2 bg-[var(--bg-lift)] p-5 sm:p-6"
              style={{ borderColor: error.code === "busy" ? "var(--v-llm)" : "var(--v-ml)" }}
            >
              <div className="flex flex-col gap-1.5">
                <p className="text-lg text-[var(--text)]">{error.message}</p>
                {error.detail && <p className="text-sm text-[var(--dim)]">{error.detail}</p>}
              </div>

              {error.code === "busy" && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setRetryIn(null);
                      run();
                    }}
                    className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-extrabold text-[var(--accent-ink)] shadow-[3px_3px_0_var(--text)] transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                  >
                    Try again now
                  </button>
                  {retryIn !== null && (
                    <span className="font-mono text-[13px] text-[var(--faint)]">
                      retrying in {retryIn}s
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {(phase === "running" || phase === "done") && (
            <motion.div
              key={phase === "running" ? "running" : record?.id}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-8"
            >
              {phase === "done" && record && (
                <div className="flex flex-col gap-3">
                  <VerdictBanner verdict={record.verdict} answers={record.work.answers} />
                  <div className="flex flex-wrap items-center gap-2.5 text-sm">
                    <a
                      href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(
                        `${origin}/v/${record.id}`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl bg-[var(--text)] px-4 py-2.5 font-bold text-[var(--bg)] shadow-[3px_3px_0_var(--accent)] transition hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                    >
                      <XLogo size={14} weight="fill" />
                      Post this verdict
                    </a>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="flex items-center gap-2 rounded-xl border-2 border-[var(--line)] px-4 py-2 font-semibold text-[var(--dim)] transition hover:border-[var(--text)] hover:text-[var(--text)]"
                    >
                      <LinkIcon size={14} weight="bold" />
                      {copied ? "Copied" : "Copy link"}
                    </button>
                  </div>
                </div>
              )}

              {phase === "done" && record && record.verdict.kind !== "not_enough_to_judge" && (
                <NextStep record={record} />
              )}

              {phase === "done" && record && record.verdict.gaps.length > 0 && (
                <SharpenPanel
                  gaps={record.verdict.gaps}
                  sharpness={record.verdict.sharpness}
                  onAdd={addPhrase}
                />
              )}

              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {phase === "running" ? "Asking nineteen questions at once" : "The nineteen checks behind it"}
                  </h3>
                  <p className="text-[13px] text-[var(--faint)]">
                    {phase === "running"
                      ? "One request to Jev, every question evaluated in parallel. Usually a few seconds."
                      : "One request. Code composed the verdict from these answers. Jev was never asked for it directly."}
                  </p>
                </div>
                <JudgmentGrid answers={record?.work.answers} pending={phase === "running"} />
              </div>

              {phase === "done" && record && (
                <VerdictDetails record={record} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
