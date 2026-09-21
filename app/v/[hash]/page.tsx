import { notFound } from "next/navigation";
import VerdictCard from "@/components/VerdictCard";
import { getVerdict } from "@/lib/store";

export default async function VerdictPage({
  params,
}: {
  params: Promise<{ hash: string }>;
}) {
  const { hash } = await params;
  const record = await getVerdict(hash);

  if (!record) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <div className="text-xs font-mono uppercase tracking-widest text-[var(--text-faint)]">
          jev-fit / verdict
        </div>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-[var(--text)]">
          {record.description}
        </p>
      </div>

      <VerdictCard record={record} />
    </main>
  );
}
