import { describe, expect, it } from "vitest";
import { ImageResponse } from "next/og";
import { DefaultCardImage, OG_SIZE, VerdictCardImage } from "@/components/og";
import { composeVerdict } from "@/lib/compose";
import { QUESTIONS } from "@/lib/questions";
import { buildState } from "@/lib/state";
import type { VerdictRecord } from "@/lib/verdict";
import { FIXTURES } from "./fixtures";

const recordFor = (f: (typeof FIXTURES)[number]): VerdictRecord => ({
  id: f.id,
  description: f.description,
  verdict: composeVerdict(f.answers, "jev-1.13.0"),
  work: { state: buildState(f.description), questions: QUESTIONS, answers: f.answers },
  createdAt: "2026-09-21T00:00:00.000Z",
});

/**
 * The JSX tests in card.test.tsx render through react-dom, which accepts CSS
 * Satori does not. Only an actual ImageResponse proves a shared link previews
 * as an image rather than as a 500, so these go through the real renderer and
 * read the bytes back.
 */
async function png(element: React.ReactElement): Promise<Buffer> {
  return Buffer.from(await new ImageResponse(element, OG_SIZE).arrayBuffer());
}

/** PNG signature, then IHDR's big-endian width and height. */
function header(buf: Buffer) {
  return {
    signature: buf.subarray(0, 8).toString("hex"),
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

const PNG_SIGNATURE = "89504e470d0a1a0a";

describe("the share card is a real PNG", () => {
  for (const f of FIXTURES) {
    it(`renders ${f.id} at the size crawlers expect`, async () => {
      const buf = await png(<VerdictCardImage record={recordFor(f)} />);
      expect(header(buf)).toEqual({
        signature: PNG_SIGNATURE,
        width: OG_SIZE.width,
        height: OG_SIZE.height,
      });
      // A card that rendered empty would still be a valid PNG; a painted one
      // at 1200x630 never compresses this small.
      expect(buf.length).toBeGreaterThan(20_000);
    }, 30_000);
  }

  it("renders the default card, which is what an expired permalink falls back to", async () => {
    const buf = await png(<DefaultCardImage />);
    expect(header(buf)).toEqual({
      signature: PNG_SIGNATURE,
      width: OG_SIZE.width,
      height: OG_SIZE.height,
    });
    expect(buf.length).toBeGreaterThan(20_000);
  }, 30_000);

  it("survives a description far longer than the card, rather than throwing", async () => {
    const record = recordFor(FIXTURES[0]);
    const buf = await png(
      <VerdictCardImage record={{ ...record, description: "a very long idea ".repeat(60) }} />,
    );
    expect(header(buf).signature).toBe(PNG_SIGNATURE);
  }, 30_000);
});
