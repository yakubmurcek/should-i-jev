import { ImageResponse } from "next/og";
import { ogFonts } from "@/components/og";

export const runtime = "nodejs";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The favicon at iOS home-screen size. iOS rounds the corners itself. */
export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffd23f",
          color: "#0f0f0f",
          fontFamily: "Bricolage",
          fontSize: 112,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        J?
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
