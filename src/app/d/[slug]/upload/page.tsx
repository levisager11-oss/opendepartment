import { requireMember } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { UploadForm } from "@/components/dept/UploadForm";
import { T } from "@/components/T";
import type { Subject } from "@/lib/tenant/types";
import { privatePage } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Member-only, so it stays out of the index even when the department
 * itself is public. The canonical is left to the department layout on
 * purpose: one address per archive, not one per screen.
 */
export const metadata = privatePage("Submit evidence");

export default async function UploadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireMember(slug);

  const supabase = await createTenantClient(member.dept);
  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name");
  if (error) throw new Error("Could not load subjects.");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <span className="docket text-2xs text-ink-500">
          <T k="upload.subtitle" />
        </span>
        <h1 className="font-serif text-2xl font-black break-words text-gov-900 sm:text-3xl">
          <T k="upload.title" />
        </h1>
      </div>

      <UploadForm userId={member.userId} subjects={(subjects ?? []) as Subject[]} />
    </div>
  );
}
