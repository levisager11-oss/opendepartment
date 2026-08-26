import { requireMember } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { VaultBrowser } from "@/components/dept/VaultBrowser";
import type { Subject } from "@/lib/tenant/types";

export const dynamic = "force-dynamic";

export default async function VaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ subject?: string }>;
}) {
  const [{ slug }, { subject }] = await Promise.all([params, searchParams]);
  const member = await requireMember(slug);

  const supabase = await createTenantClient(member.dept);
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name");

  return (
    <VaultBrowser
      subjects={(subjects ?? []) as Subject[]}
      currentUserId={member.userId}
      isAdmin={member.profile.is_admin}
      initialSubjectId={subject ?? ""}
    />
  );
}
