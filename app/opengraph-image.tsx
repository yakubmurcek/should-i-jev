import { ImageResponse } from "next/og";
import { DefaultCardImage, OG_SIZE } from "@/components/og";

export const runtime = "nodejs";
export const alt = "Should I Jev? Describe a feature and get a verdict on what should power it.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(<DefaultCardImage />, size);
}
