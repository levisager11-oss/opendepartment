import { Suspense } from "react";
import { MarketingShell } from "@/components/MarketingShell";
import { ReportForm } from "@/components/ReportForm";
import { T } from "@/components/T";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Report a department",
  description:
    "Tell OpenDepartment about an archive that should not be online. No account needed.",
  path: "/report",
});

/**
 * The host's takedown path.
 *
 * Distinct from the per-file report inside a department, which goes to that
 * department's own administrator: this one goes to whoever runs the platform,
 * and is the right route when the administrator IS the problem. Suspending a
 * department stops its slug resolving without touching a byte of its owner's
 * data, which stays in their own Supabase project.
 */
export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;

  return (
    <MarketingShell>
      <h1 className="mb-2 font-serif text-2xl font-black break-words text-ink-900 sm:text-3xl">
        <T k="abuse.title" />
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        <T k="abuse.intro" />
      </p>

      <Suspense fallback={null}>
        <ReportForm presetSlug={slug} />
      </Suspense>
    </MarketingShell>
  );
}
