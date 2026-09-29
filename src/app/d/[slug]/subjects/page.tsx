import { requireMember } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { SubjectIndex, type SubjectSummary } from "@/components/dept/SubjectIndex";
import { privatePage } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Member-only, so it stays out of the index even when the department
 * itself is public. The canonical is left to the department layout on
 * purpose: one address per archive, not one per screen.
 */
export const metadata = privatePage("Subjects");

/**
 * Every subject the administrators maintain, with what is filed under it.
 *
 * The counts come from files_public with the same `subject_ids` filter the
 * vault applies when a subject is picked, so the number on a card is the
 * number of cards that click lands on -- a document whose owner is gone from
 * the view is gone from both. One exact count per subject rather than one
 * read of every row: PostgREST stops at its max-rows setting (1,000 on a
 * stock Supabase project) and a tally of a truncated read would be wrong
 * without saying so. A department has tens of subjects, not thousands.
 */
export default async function SubjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireMember(slug);
  const supabase = await createTenantClient(member.dept);

  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("id, name, description")
    .order("name");
  if (error) throw new Error("Could not load subjects.");

  const summaries: SubjectSummary[] = await Promise.all(
    (subjects ?? []).map(async (subject) => {
      const { data, count, error: countError } = await supabase
        .from("files_public")
        .select("created_at", { count: "exact" })
        .contains("subject_ids", [subject.id])
        .order("created_at", { ascending: false })
        .limit(1);
      if (countError) throw new Error("Could not count a subject's documents.");
      return {
        id: subject.id as string,
        name: subject.name as string,
        description: (subject.description as string | null) ?? null,
        count: count ?? 0,
        latest: (data?.[0]?.created_at as string | undefined) ?? null,
      };
    })
  );

  return <SubjectIndex subjects={summaries} isAdmin={member.profile.is_admin} />;
}
