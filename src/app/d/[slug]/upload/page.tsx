import { requireMember } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { UploadForm } from "@/components/dept/UploadForm";
import { T } from "@/components/T";
import type { Subject } from "@/lib/tenant/types";

export const dynamic = "force-dynamic";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireMember(slug);

  const supabase = await createTenantClient(member.dept);
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <span className="docket">
          <T k="upload.subtitle" />
        </span>
        <h1 className="font-[family-name:var(--font-serif)] text-3xl font-black text-gov-900">
          <T k="upload.title" />
        </h1>
      </div>

      <UploadForm userId={member.userId} subjects={(subjects ?? []) as Subject[]} />
    </div>
  );
}
