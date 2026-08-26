import Link from "next/link";
import { requireDepartment } from "@/lib/tenant/auth";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

/**
 * Member-only, so it stays out of the index even when the department
 * itself is public. The canonical is left to the department layout on
 * purpose: one address per archive, not one per screen.
 */
export const metadata = privatePage("Access denied");

export default async function AccessDeniedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const { slug } = await params;
  const { reason } = await searchParams;
  const { branding } = await requireDepartment(slug);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <Seal
        size={90}
        className="mx-auto mb-8 opacity-50"
        top={branding.sealTop}
        bottom={branding.sealBottom}
        accent={branding.accent}
        idPrefix="denied"
      />

      <p className="stamp stamp-red mb-8 inline-block">
        <T k="error.accessDenied" />
      </p>

      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        <T k={reason === "banned" ? "error.banned" : "error.accessDeniedBody"} />
      </p>

      <Link
        href={`/d/${slug}/login`}
        className="text-sm text-gov-800 underline underline-offset-4"
      >
        <T k="auth.signin" />
      </Link>
    </div>
  );
}
