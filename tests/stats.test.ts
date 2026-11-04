import { describe, expect, it } from "vitest";
import { countsHere, daysSince } from "@/lib/stats";
import { countsAsVisit } from "@/components/Beacon";

describe("countsHere", () => {
  it("counts only the live Vercel deployment", () => {
    expect(countsHere({ VERCEL_ENV: "production", NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(true);
    expect(countsHere({ VERCEL_ENV: "preview", NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(false);
    expect(countsHere({ VERCEL_ENV: "development", NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(false);
  });

  it("off Vercel, counts a production build and skips next dev", () => {
    expect(countsHere({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBe(true);
    expect(countsHere({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(false);
  });
});

describe("daysSince", () => {
  const now = new Date("2026-11-04T01:30:00Z");
  it("counts whole UTC days", () => {
    expect(daysSince("2026-11-04", now)).toBe(0);
    expect(daysSince("2026-11-03", now)).toBe(1);
    expect(daysSince("2026-10-19", now)).toBe(16);
  });
});

describe("countsAsVisit", () => {
  it("skips the private stats page, counts everything else", () => {
    expect(countsAsVisit("/stats")).toBe(false);
    expect(countsAsVisit("/")).toBe(true);
    expect(countsAsVisit("/v/abc123")).toBe(true);
    expect(countsAsVisit(null)).toBe(true);
  });
});
