import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });
// Display only: headlines and the verdict. Everything read at length is sans.
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  // Absolute URLs for og:image. Without this Next emits a relative path and
  // most crawlers, X included, will not fetch it.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: "ShouldIJev",
  description:
    "Describe a feature. Watch nineteen typed judgments resolve, and get a verdict on what should actually power it. It says no.",
  openGraph: {
    title: "ShouldIJev",
    description:
      "Describe a feature. Watch nineteen typed judgments resolve, and get a verdict on what should actually power it.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "ShouldIJev" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body className="min-h-[100dvh] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
