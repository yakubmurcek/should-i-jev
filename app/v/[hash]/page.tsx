import { notFound } from "next/navigation";
import Masthead from "@/components/Masthead";
import MadeBy from "@/components/MadeBy";
import Studio from "@/components/Studio";
import { getVerdict } from "@/lib/store";
import { STAMP } from "@/components/verdict-meta";
import { OG_BASE, SITE_NAME, TWITTER_BASE, clip } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const record = await getVerdict(hash);
  if (!record) return { title: "Verdict not found" };
  const { headline, sub: gist } = STAMP[record.verdict.kind];
  const title = `${headline.replace(/\.$/, "")} · ${SITE_NAME}`;
  // Kept under 155 chars so search and share previews show it whole.
  const description = `"${clip(record.description, 155 - gist.length - 4)}" ${gist}`;
  const url = `/v/${hash}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { ...OG_BASE, type: "article" as const, url, title, description },
    twitter: { ...TWITTER_BASE, title, description },
  };
}

export default async function VerdictPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const record = await getVerdict(hash);
  if (!record) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${STAMP[record.verdict.kind].headline} ${STAMP[record.verdict.kind].sub}`,
    description: `${clip(record.description, 200)} ${STAMP[record.verdict.kind].sub}`,
    isPartOf: { "@type": "WebSite", name: SITE_NAME },
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <header className="flex flex-col gap-5">
        <Masthead right={`verdict/${record.id}`} />
        <p className="max-w-[60ch] text-[17px] leading-relaxed text-[var(--dim)]">
          Is this a Jev job? Here is the verdict and the nineteen checks Jev ran on it. Edit the
          description to check your own feature.
        </p>
      </header>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <Studio initial={record} />

      <MadeBy />
    </main>
  );
}
