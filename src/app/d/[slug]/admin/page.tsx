import { requireDeptAdmin } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";

/**
 * The department's administration screen.
 *
 * In the single-tenant original this page built a service-role client and read
 * whatever it liked. Here every query runs as the signed-in administrator
 * under the tenant's own RLS, and the one thing RLS alone cannot express --
 * "administrators may see member e-mail addresses" -- comes from the
 * admin_list_members() function, which re-checks is_admin() in the database.
 *
 * If somebody who is not an admin reaches this page, requireDeptAdmin sends
 * them away; and even if that check were bypassed, every query below would
 * simply return nothing.
 */
export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = await requireDeptAdmin(slug);
  const supabase = await createTenantClient(member.dept);

  const [
    { data: files },
    { data: reports },
    { data: members },
    { data: invites },
    { data: subjects },
    { data: fileSubjects },
    { data: audit },
  ] = await Promise.all([
    supabase
      .from("files")
      .select(
        "id, title, category, kind, size_bytes, score, upvotes, downvotes, report_count, created_at, owner_id, case_number"
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("reports")
      .select("id, file_id, reporter_id, reason, details, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("admin_list_members"),
    supabase
      .from("invites")
      .select("code, note, max_uses, uses, grants_admin, expires_at, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("subjects")
      .select("id, name, description, created_at")
      .order("name"),
    supabase.from("file_subjects").select("subject_id"),
    supabase
      .from("audit_log")
      .select("id, actor_id, action, target, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  type MemberRow = {
    id: string;
    username: string | null;
    is_admin: boolean;
    is_banned: boolean;
    created_at: string;
    email: string | null;
    file_count: number;
  };

  const memberRows = (members ?? []) as MemberRow[];

  const emailByUser = new Map(memberRows.map((m) => [m.id, m.email]));
  const usernameById = new Map(memberRows.map((m) => [m.id, m.username]));

  const fileCountBySubject = new Map<string, number>();
  (fileSubjects ?? []).forEach((row) => {
    const id = row.subject_id as string;
    fileCountBySubject.set(id, (fileCountBySubject.get(id) ?? 0) + 1);
  });

  const titleByFile = new Map(
    (files ?? []).map((f) => [f.id as string, f.title as string])
  );

  return (
    <AdminPanel
      currentUserId={member.userId}
      files={(files ?? []).map((f) => ({
        ...f,
        owner_username: usernameById.get(f.owner_id as string) ?? null,
        owner_email: emailByUser.get(f.owner_id as string) ?? null,
      }))}
      reports={(reports ?? []).map((r) => ({
        ...r,
        file_title: r.file_id ? (titleByFile.get(r.file_id) ?? null) : null,
        reporter_username: usernameById.get(r.reporter_id as string) ?? null,
      }))}
      users={memberRows.map((m) => ({
        id: m.id,
        username: m.username,
        is_admin: m.is_admin,
        is_banned: m.is_banned,
        created_at: m.created_at,
        email: m.email,
        // Comes back from the database as a bigint, so it arrives as a string.
        file_count: Number(m.file_count ?? 0),
      }))}
      invites={invites ?? []}
      subjects={(subjects ?? []).map((s) => ({
        ...s,
        file_count: fileCountBySubject.get(s.id as string) ?? 0,
      }))}
      audit={(audit ?? []).map((a) => ({
        ...a,
        actor_username: a.actor_id ? (usernameById.get(a.actor_id) ?? null) : null,
      }))}
      totalBytes={(files ?? []).reduce(
        (sum, f) => sum + Number(f.size_bytes ?? 0),
        0
      )}
    />
  );
}
