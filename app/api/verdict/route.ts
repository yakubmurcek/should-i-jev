import { NextResponse } from "next/server";
import { JevError, MODEL, askJev } from "@/lib/jev/client";
import { QUESTIONS, QUESTION_IDS } from "@/lib/questions";
import { MAX_DESCRIPTION_CHARS, MIN_DESCRIPTION_CHARS, buildState } from "@/lib/state";
import { MissingAnswerError, composeVerdict } from "@/lib/compose";
import { RATE_LIMIT, checkDailyCap, checkRateLimit, getVerdict, putVerdict, verdictId } from "@/lib/store";
import type { VerdictRecord } from "@/lib/verdict";

export const runtime = "nodejs";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

type Code = "too_short" | "too_long" | "busy" | "unconfigured" | "upstream" | "rate_limited";

/**
 * The visitor gets a sentence, never the upstream response body. A raw
 * `{"detail":{"error_type":...}}` blob on screen is both ugly and more than
 * they should see; the detail goes to the server log instead.
 */
function fail(status: number, code: Code, error: string, detail?: string) {
  return NextResponse.json({ code, error, detail }, { status });
}

export async function POST(req: Request) {
  let description: unknown;
  try {
    ({ description } = (await req.json()) as { description?: unknown });
  } catch {
    return fail(400, "too_short", "Send a JSON body with a `description` field.");
  }

  if (typeof description !== "string" || description.trim().length < MIN_DESCRIPTION_CHARS) {
    return fail(
      400,
      "too_short",
      `Describe the feature in at least ${MIN_DESCRIPTION_CHARS} characters: what goes in, what comes out, and the call being made.`,
    );
  }

  // §7 — the length cap is a correctness measure before it is a cost one:
  // irrelevant detail distracts the model and reduces accuracy. Over-length
  // input is rejected with an explanation, never silently truncated.
  if (description.length > MAX_DESCRIPTION_CHARS) {
    return fail(
      413,
      "too_long",
      `That is ${description.length} characters; the limit is ${MAX_DESCRIPTION_CHARS}.`,
      "This is not a cost limit. Detail that does not bear on the decision distracts the model and makes the verdict worse, so long descriptions are rejected rather than trimmed for you. Describe one decision.",
    );
  }

  const id = verdictId(description);

  const cached = await getVerdict(id);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const rate = await checkRateLimit(clientIp(req));
  if (!rate.ok) {
    const mins = Math.ceil(rate.resetInSeconds / 60);
    return fail(
      429,
      "rate_limited",
      `That is ${RATE_LIMIT.max} verdicts in ten minutes, which is the cap from one address.`,
      `The counter resets in ${mins === 1 ? "under a minute" : `about ${mins} minutes`}. Verdicts you have already seen still open instantly — they are cached and do not count.`,
    );
  }

  const daily = await checkDailyCap();
  if (!daily.ok) {
    return fail(
      429,
      "rate_limited",
      "The tool has hit its daily limit of new verdicts.",
      "It resets at midnight UTC. Verdicts already made, including shared links, still open.",
    );
  }

  const state = buildState(description.trim());

  // ONE request, nineteen questions, one subject. They are evaluated in parallel,
  // so asking all of them costs little more than asking one.
  let response;
  try {
    response = await askJev({ state, questions: QUESTIONS });
  } catch (err) {
    if (err instanceof JevError) {
      // The upstream body is for the operator, not the visitor.
      console.error("[verdict] jev call failed:", err.message);

      if (err.status === 401 || err.status === 0) {
        return fail(500, "unconfigured", "This deployment cannot reach Jev right now.");
      }
      // 529 and friends are TypeSafe saying "busy", after the client already
      // spent its full retry budget. It is worth trying again in a moment.
      if (err.retryable) {
        return fail(
          503,
          "busy",
          "Jev is busy right now.",
          "TypeSafe is under load and turned the request away. Your description is safe, nothing was judged.",
        );
      }
      return fail(502, "upstream", "Jev turned that request away.");
    }
    throw err;
  }

  const missing = QUESTION_IDS.filter((qid) => !(qid in response.answers));
  if (missing.length > 0) {
    console.error("[verdict] incomplete response, missing:", missing.join(", "));
    return fail(502, "upstream", "Jev sent back an incomplete answer set.");
  }

  let verdict;
  try {
    verdict = composeVerdict(response.answers, response.model ?? MODEL);
  } catch (err) {
    if (err instanceof MissingAnswerError) {
      console.error("[verdict] shape mismatch:", err.message);
      return fail(502, "upstream", "Jev's answer did not match the expected shape.");
    }
    throw err;
  }

  const record: VerdictRecord = {
    id,
    description: description.trim(),
    verdict,
    work: { state, questions: QUESTIONS, answers: response.answers },
    createdAt: new Date().toISOString(),
  };

  await putVerdict(record);

  return NextResponse.json({ ...record, cached: false, remaining: rate.remaining });
}
