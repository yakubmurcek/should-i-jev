import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  // Absolute URLs for og:image. Without this Next emits a relative path and
  // most crawlers, X included, will not fetch it.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: "Does it fit Jev?",
  description:
    "Describe a feature. Watch nineteen typed judgments resolve, and get a verdict on what should actually power it. It says no.",
  openGraph: {
    title: "Does it fit Jev?",
    description:
      "Describe a feature. Watch nineteen typed judgments resolve, and get a verdict on what should actually power it.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Does it fit Jev?" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-[100dvh] font-[family-name:var(--font-sans)] antialiased">
        {children}
      </body>
    </html>
  );
}
