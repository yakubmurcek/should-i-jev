import { notFound } from "next/navigation";
import Masthead from "@/components/Masthead";
import MadeBy from "@/components/MadeBy";
import Studio from "@/components/Studio";
import { getVerdict } from "@/lib/store";
import { VERDICT_GIST } from "@/components/verdict-meta";

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const record = await getVerdict(hash);
  if (!record) return { title: "Verdict not found" };
  const title = `${record.verdict.headline} · Should I Jev?`;
  const description = `"${record.description.slice(0, 120)}", ${VERDICT_GIST[record.verdict.kind]}`;
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: "summary_large_image" as const, title, description },
  };
}

export default async function VerdictPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const record = await getVerdict(hash);
  if (!record) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <header className="flex flex-col gap-5">
        <Masthead right={`verdict/${record.id}`} />
        <p className="max-w-[60ch] text-[17px] leading-relaxed text-[var(--dim)]">
          Is this a Jev job? Here is the verdict and the nineteen checks Jev ran on it. Edit the
          description to check your own feature.
        </p>
      </header>

      <Studio initial={record} />

      <MadeBy />
    </main>
  );
}
