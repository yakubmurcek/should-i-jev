import { notFound } from "next/navigation";
import Link from "next/link";
import Studio from "@/components/Studio";
import { getVerdict } from "@/lib/store";
import { VERDICT_GIST } from "@/components/verdict-meta";

export async function generateMetadata({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const record = await getVerdict(hash);
  if (!record) return { title: "Verdict not found" };
  const title = `${record.verdict.headline} · ShouldIJev`;
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-[13px] font-medium tracking-wide text-[var(--dim)] transition hover:text-[var(--accent)]"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
          Should I Jev?
        </Link>
        <p className="max-w-[60ch] text-lg leading-relaxed text-[var(--dim)] sm:text-xl">
          Does this feature actually need an LLM? Here is the verdict and the nineteen checks behind
          it. Edit the description to judge your own.
        </p>
      </header>

      <Studio initial={record} />
    </main>
  );
}
