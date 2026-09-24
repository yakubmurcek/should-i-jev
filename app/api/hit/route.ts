import { clientIp, track } from "@/lib/stats";

export const runtime = "nodejs";

/** Page-view beacon. Always 204: the page never waits on or reacts to it. */
export async function POST(req: Request) {
  await track("view", clientIp(req));
  return new Response(null, { status: 204 });
}
