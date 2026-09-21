"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Link as LinkIcon, XLogo } from "@phosphor-icons/react";
import type { VerdictRecord } from "@/lib/verdict";
import { MAX_DESCRIPTION_CHARS, MIN_DESCRIPTION_CHARS } from "@/lib/state";
import { EXAMPLES, VERDICT_GIST } from "@/components/verdict-meta";
import JudgmentGrid from "@/components/JudgmentGrid";
import VerdictBanner from "@/components/VerdictBanner";
import SharpenPanel from "@/components/SharpenPanel";
import VerdictDetails from "@/components/VerdictDetails";

type Phase = "idle" | "running" | "done" | "error";

export default function Studio({ initial }: { initial?: VerdictRecord }) {
  const [text, setText] = useState(initial?.description ?? "");
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle");
  const [record, setRecord] = useState<VerdictRecord | null>(initial ?? null);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const tooShort = text.trim().length < MIN_DESCRIPTION_CHARS;
  const over = text.length > MAX_DESCRIPTION_CHARS;

  async function run(description = text) {
    if (description.trim().length < MIN_DESCRIPTION_CHARS || description.length > MAX_DESCRIPTION_CHARS) return;
    setPhase("running");
    setError(null);
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
        setError({ message: data.error ?? "Something went wrong.", detail: data.detail });
        setPhase("error");
        return;
      }
      setRecord(data as VerdictRecord);
      setPhase("done");
      window.history.replaceState(null, "", `/v/${data.id}`);
    } catch {
      setError({ message: "Could not reach the server. Nothing was judged." });
      setPhase("error");
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
        <div className="relative rounded-2xl border border-[var(--line)] bg-[var(--bg-lift)] transition focus-within:border-[var(--accent)]">
          <textarea
            ref={boxRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
            }}
            rows={3}
            aria-label="Describe your feature"
            placeholder="A feature you are thinking about building. One decision, in a sentence or two."
            className="w-full resize-none bg-transparent px-4 py-4 text-base leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--faint)] sm:px-5 sm:text-lg"
          />
          <div className="flex items-center justify-between gap-3 border-t border-[var(--line-soft)] px-4 py-2.5 sm:px-5">
            <span
              className="font-[family-name:var(--font-mono)] text-[12px] tabular-nums"
              style={{ color: over ? "var(--v-ml)" : "var(--faint)" }}
            >
              {text.length}/{MAX_DESCRIPTION_CHARS}
            </span>
            <button
              type="button"
              onClick={() => run()}
              disabled={tooShort || over || phase === "running"}
              className="flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-ink)] transition enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:opacity-35"
            >
              {phase === "running" ? "Judging" : "Judge it"}
              <ArrowRight size={15} weight="bold" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                setText(ex.text);
                run(ex.text);
              }}
              className="rounded-full border border-[var(--line)] px-3 py-1.5 text-[13px] text-[var(--dim)] transition hover:border-[var(--accent)] hover:text-[var(--text)] active:scale-[0.98]"
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
              className="rounded-2xl border border-[rgb(255_122_156/0.35)] bg-[var(--bg-lift)] p-5"
            >
              <p className="text-[var(--text)]">{error.message}</p>
              {error.detail && <p className="mt-2 text-sm text-[var(--dim)]">{error.detail}</p>}
            </motion.div>
          )}

          {(phase === "running" || phase === "done") && (
            <motion.div
              key={phase === "running" ? "running" : record?.id}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-8"
            >
              {phase === "done" && record && <VerdictBanner verdict={record.verdict} />}

              {phase === "done" && record && record.verdict.gaps.length > 0 && (
                <SharpenPanel
                  gaps={record.verdict.gaps}
                  sharpness={record.verdict.sharpness}
                  onAdd={addPhrase}
                />
              )}

              <div className="flex flex-col gap-4">
                <p className="text-[13px] text-[var(--faint)]">
                  {phase === "running"
                    ? "Nineteen judgments, one request, all evaluated in parallel."
                    : "Nineteen judgments, one request. Code composed the verdict from these, it was never asked for directly."}
                </p>
                <JudgmentGrid answers={record?.work.answers} pending={phase === "running"} />
              </div>

              {phase === "done" && record && (
                <>
                  <VerdictDetails record={record} />
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(
                        typeof window !== "undefined" ? `${window.location.origin}/v/${record.id}` : "",
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--dim)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                    >
                      <XLogo size={14} weight="fill" />
                      Post this verdict
                    </a>
                    <button
                      type="button"
                      onClick={copyLink}
                      className="flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--dim)] transition hover:border-[var(--accent)] hover:text-[var(--text)] active:scale-[0.98]"
                    >
                      <LinkIcon size={14} weight="bold" />
                      {copied ? "Copied" : "Copy link"}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
