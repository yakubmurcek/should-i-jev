import { NextResponse, after } from "next/server";
import { JevError, MODEL, askJev } from "@/lib/jev/client";
import { QUESTIONS, QUESTION_IDS } from "@/lib/questions";
import { MAX_DESCRIPTION_CHARS, MIN_DESCRIPTION_CHARS, buildState } from "@/lib/state";
import { MissingAnswerError, composeVerdict } from "@/lib/compose";
import { RATE_LIMIT, checkDailyCap, checkRateLimit, getVerdict, putVerdict, verdictId } from "@/lib/store";
import type { VerdictRecord } from "@/lib/verdict";
import { clientIp, isOwner, markOwnerVerdict, track, type StatEvent } from "@/lib/stats";

export const runtime = "nodejs";

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
  const res = await judge(req);
  const mine = isOwner(req);
  if (mine && res.status === 200) {
    const { id } = (await res.clone().json()) as { id: string };
    after(() => markOwnerVerdict(id));
  }
  const event: StatEvent | null =
    res.status === 200 ? ((await res.clone().json()).cached ? "cached" : "new")
    : res.status === 429 ? "limited"
    : res.status >= 500 ? "error"
    : null; // 4xx input errors are the visitor's typing, not usage
  if (event) {
    const ip = clientIp(req);
    after(() => track(event, ip, mine));
  }
  return res;
}

async function judge(req: Request) {
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
  after(() => warmShareImages(new URL(`/v/${record.id}`, req.url)));

  return NextResponse.json({ ...record, cached: false, remaining: rate.remaining });
}

/**
 * Render a new verdict's share images once, right away. X fetches a card image a single
 * time and caches the outcome per image URL: a slow cold render there leaves the link
 * with a text-only card for good. This way its first fetch is a CDN hit.
 */
async function warmShareImages(page: URL) {
  try {
    const html = await (await fetch(page, { headers: { "user-agent": "Twitterbot/1.0" } })).text();
    const urls = [...html.matchAll(/<meta (?:property|name)="(?:og|twitter):image" content="([^"]+)"/g)].map((m) =>
      m[1].replace(/&amp;/g, "&"),
    );
    await Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer())));
  } catch (err) {
    console.warn("share image warm-up failed", err);
  }
}
