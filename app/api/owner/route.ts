import { NextResponse } from "next/server";
import { OWNER_COOKIE, ownerToken } from "@/lib/stats";

export const runtime = "nodejs";

/** Marks this browser as the owner's, so its visits and verdicts stop counting. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const token = ownerToken();
  if (!token || key !== process.env.STATS_KEY) return new Response("Not found", { status: 404 });

  const res = NextResponse.redirect(new URL(`/stats?key=${encodeURIComponent(key)}`, url));
  res.cookies.set(OWNER_COOKIE, token, {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
  return res;
}
