import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jev Fit",
  description:
    "Describe a feature. Get a typed verdict on whether it fits Jev, an LLM, classical ML, or just plain code.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6 sm:py-16">
          {children}
        </div>
      </body>
    </html>
  );
}
