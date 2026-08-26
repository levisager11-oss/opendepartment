import { requireMember } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { VaultBrowser, type VaultFilters } from "@/components/dept/VaultBrowser";
import type { FileKind, SortKey, Subject } from "@/lib/tenant/types";
import { privatePage } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Member-only, so it stays out of the index even when the department
 * itself is public. The canonical is left to the department layout on
 * purpose: one address per archive, not one per screen.
 */
export const metadata = privatePage("The Vault");

const SORTS: SortKey[] = ["top", "new", "worst", "views", "discussed"];
const KINDS: FileKind[] = ["image", "pdf", "video", "audio"];

type Query = {
  q?: string;
  sort?: string;
  subject?: string;
  category?: string;
  kind?: string;
  mine?: string;
};

/**
 * The query string is user input, and it lands in state that drives database
 * filters -- so every value is checked against the set it is allowed to come
 * from rather than trusted. `category` is the exception: a department defines
 * its own list and can change it, so an unrecognised one is dropped instead
 * of being matched against a fixed enum -- and `subject` is checked against
 * the ids that actually exist, which both keeps a malformed uuid out of the
 * query and stops the dropdown reading "All" while a filter is in force.
 */
function readFilters(
  query: Query,
  categories: string[],
  subjectIds: string[]
): VaultFilters {
  const category = query.category ?? "";
  const kind = query.kind ?? "";
  const sort = query.sort ?? "";

  return {
    q: (query.q ?? "").slice(0, 200),
    sort: SORTS.includes(sort as SortKey) ? (sort as SortKey) : "top",
    subject: subjectIds.includes(query.subject ?? "")
      ? (query.subject as string)
      : "",
    category: categories.includes(category) ? category : "",
    kind: KINDS.includes(kind as FileKind) ? kind : "",
    mine: query.mine === "1",
  };
}

export default async function VaultPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const member = await requireMember(slug);

  const supabase = await createTenantClient(member.dept);
  const { data } = await supabase
    .from("subjects")
    .select("id, name")
    .order("name");

  const subjects = (data ?? []) as Subject[];

  return (
    <VaultBrowser
      subjects={subjects}
      currentUserId={member.userId}
      initialFilters={readFilters(
        query,
        member.branding.categories,
        subjects.map((s) => s.id)
      )}
    />
  );
}
