import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sans = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  // Absolute URLs for og:image. Without this Next emits a relative path and
  // most crawlers, X included, will not fetch it.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: "Should I Jev?",
  description:
    "Jev is TypeSafe's typed-judgment model. Describe a feature and find out if it's a Jev job, checked against the list of what Jev is bad at.",
  openGraph: {
    title: "Should I Jev?",
    description: "Describe a feature and find out if it's a Jev job. It says so when it isn't.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Should I Jev?", creator: "@ykbmck" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-[100dvh] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
