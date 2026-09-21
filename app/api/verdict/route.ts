import { NextResponse } from "next/server";
import { JevError, MODEL, askJev } from "@/lib/jev/client";
import { QUESTIONS, QUESTION_IDS } from "@/lib/questions";
import { MAX_DESCRIPTION_CHARS, MIN_DESCRIPTION_CHARS, buildState } from "@/lib/state";
import { MissingAnswerError, composeVerdict } from "@/lib/compose";
import { checkRateLimit, getVerdict, putVerdict, verdictId } from "@/lib/store";
import type { VerdictRecord } from "@/lib/verdict";

export const runtime = "nodejs";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function fail(status: number, error: string, detail?: string) {
  return NextResponse.json({ error, detail }, { status });
}

export async function POST(req: Request) {
  let description: unknown;
  try {
    ({ description } = (await req.json()) as { description?: unknown });
  } catch {
    return fail(400, "Send a JSON body with a `description` field.");
  }

  if (typeof description !== "string" || description.trim().length < MIN_DESCRIPTION_CHARS) {
    return fail(
      400,
      `Describe the feature in at least ${MIN_DESCRIPTION_CHARS} characters, what goes in, what comes out, and the call being made.`,
    );
  }

  // §7 — the length cap is a correctness measure before it is a cost one:
  // irrelevant detail distracts the model and reduces accuracy. Over-length
  // input is rejected with an explanation, never silently truncated.
  if (description.length > MAX_DESCRIPTION_CHARS) {
    return fail(
      413,
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
    return fail(429, "Too many verdicts from this address. Try again shortly.");
  }

  const state = buildState(description.trim());

  // ONE request, fifteen questions, one subject. They are evaluated in parallel,
  // so asking all of them costs little more than asking one.
  let response;
  try {
    response = await askJev({ state, questions: QUESTIONS });
  } catch (err) {
    if (err instanceof JevError) {
      const status = err.status === 401 ? 500 : err.status || 502;
      return fail(
        status,
        err.status === 401
          ? "This deployment is not configured to reach Jev."
          : "Jev could not be reached. Nothing was judged.",
        err.message,
      );
    }
    throw err;
  }

  const missing = QUESTION_IDS.filter((qid) => !(qid in response.answers));
  if (missing.length > 0) {
    return fail(502, "Jev's response was incomplete.", `missing answers: ${missing.join(", ")}`);
  }

  let verdict;
  try {
    verdict = composeVerdict(response.answers, response.model ?? MODEL);
  } catch (err) {
    if (err instanceof MissingAnswerError) {
      return fail(502, "Jev's response did not match the expected shape.", err.message);
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

  return NextResponse.json({ ...record, cached: false });
}
