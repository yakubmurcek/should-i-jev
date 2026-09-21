"use client";

import { useState } from "react";
import VerdictCard from "@/components/VerdictCard";
import { MAX_DESCRIPTION_CHARS, MIN_DESCRIPTION_CHARS } from "@/lib/state";
import type { VerdictRecord } from "@/lib/verdict";

type ErrorState = { error: string; detail?: string } | null;

export default function DescribeForm() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const [record, setRecord] = useState<VerdictRecord | null>(null);
  const [copied, setCopied] = useState(false);

  const length = description.length;
  const overLimit = length > MAX_DESCRIPTION_CHARS;
  const underLimit = length > 0 && length < MIN_DESCRIPTION_CHARS;
  const permalink = record ? `/v/${record.id}` : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setRecord(null);
    setCopied(false);
    setLoading(true);

    try {
      const res = await fetch("/api/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });

      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // no body
      }

      if (!res.ok) {
        const b = (body ?? {}) as { error?: string; detail?: string };
        setError({
          error: b.error || fallbackMessage(res.status),
          detail: b.detail,
        });
        return;
      }

      setRecord(body as VerdictRecord);
    } catch {
      setError({
        error: "Could not reach the server.",
        detail: "Check your connection and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!permalink) return;
    const url = `${window.location.origin}${permalink}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the link is still shown and selectable
    }
  }

  const canSubmit = !loading && length >= MIN_DESCRIPTION_CHARS && !overLimit;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label htmlFor="description" className="text-sm text-[var(--text-dim)]">
          What goes in, what comes out, and the call being made in between.
        </label>
        <textarea
          id="description"
          name="description"
          rows={7}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Given a support email's subject and body, route it to one of nine queues based on what the customer is asking for."
          className="w-full resize-y rounded-md border bg-[var(--bg-inset)] px-4 py-3 text-base leading-relaxed text-[var(--text)] outline-none placeholder:text-[var(--text-faint)] focus:border-[var(--accent)]"
          style={{ borderColor: "var(--border)" }}
        />
        <div className="flex items-center justify-between text-xs">
          <span
            className={`font-mono ${
              overLimit ? "text-[var(--v-not-enough)]" : "text-[var(--text-faint)]"
            }`}
          >
            {length} / {MAX_DESCRIPTION_CHARS}
          </span>
          {underLimit && (
            <span className="text-[var(--text-faint)]">
              at least {MIN_DESCRIPTION_CHARS} characters
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-1 self-start rounded-md px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--accent)", color: "#04201b" }}
        >
          {loading ? "Judging…" : "Get a verdict"}
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-md border px-4 py-3"
          style={{ borderColor: "var(--v-not-enough)", background: "var(--bg-raised)" }}
        >
          <p className="text-sm text-[var(--text)]">{error.error}</p>
          {error.detail && (
            <p className="text-sm text-[var(--text-dim)]">{error.detail}</p>
          )}
        </div>
      )}

      {record && (
        <div className="flex flex-col gap-4">
          <VerdictCard record={record} />
          {permalink && (
            <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-dim)]">
              <span>Permalink:</span>
              <code className="rounded border px-2 py-1 font-mono text-xs text-[var(--text)]" style={{ borderColor: "var(--border)" }}>
                {permalink}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="rounded border px-2 py-1 text-xs text-[var(--text-dim)] hover:text-[var(--text)]"
                style={{ borderColor: "var(--border)" }}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fallbackMessage(status: number): string {
  if (status === 429) return "Too many verdicts from this address. Try again shortly.";
  if (status >= 500) return "Jev could not be reached. Nothing was judged.";
  return "That description could not be judged.";
}
