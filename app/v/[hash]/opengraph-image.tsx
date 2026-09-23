import { ImageResponse } from "next/og";
import { DefaultCardImage, OG_SIZE, VerdictCardImage, ogFonts } from "@/components/og";
import { getVerdict } from "@/lib/store";

export const runtime = "nodejs";
export const alt = "A verdict on whether a described feature fits Jev.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const record = await getVerdict(hash);

  // A shared link to a verdict that has expired still previews as the product
  // rather than as a broken image.
  return new ImageResponse(
    record ? <VerdictCardImage record={record} /> : <DefaultCardImage />,
    { ...size, fonts: await ogFonts() },
  );
}
