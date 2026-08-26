import Link from "next/link";
import { redirect } from "next/navigation";
import { createControlClient, CONTROL_CONFIGURED } from "@/lib/control/client";
import { getBranding } from "@/lib/tenant/branding";
import { MarketingShell } from "@/components/MarketingShell";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { DepartmentRow } from "@/components/account/DepartmentRow";
import { privatePage } from "@/lib/seo";

export const metadata = privatePage("Your departments", { path: "/account" });

export default async function AccountPage() {
  if (!CONTROL_CONFIGURED) redirect("/");

  const supabase = await createControlClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?next=/account");

  const { data: departments } = await supabase
    .from("departments")
    .select(
      "slug, display_name, tagline, visibility, status, created_at, supabase_url, anon_key"
    )
    .order("created_at", { ascending: false });

  /**
   * The directory keeps its own copy of a department's name, and renaming
   * under Administration only ever touched the tenant's `settings` row -- so
   * the listing could go on advertising a name the department had stopped
   * using. Ask each project what it calls itself now and hand the answer
   * down; the row offers to copy it across.
   *
   * At most three departments per account, and getBranding() falls back to
   * the directory's own copy when a project is unreachable, so an offline
   * tenant reads as "no drift" rather than stalling the page.
   */
  const rows = await Promise.all(
    (departments ?? []).map(async (row) => {
      // The project's coordinates are needed to ask it its name and go no
      // further: `dept` below is what reaches the client component, and a
      // department's URL and key have no business in the payload of a page
      // that only lists departments.
      const { supabase_url, anon_key, ...dept } = row;

      const branding = await getBranding({
        slug: dept.slug,
        supabase_url,
        anon_key,
        display_name: dept.display_name,
        tagline: dept.tagline,
        visibility: dept.visibility as "unlisted" | "public",
      });

      return {
        dept,
        liveName:
          branding.departmentName !== dept.display_name
            ? branding.departmentName
            : null,
        liveTagline:
          (branding.tagline ?? null) !== dept.tagline
            ? (branding.tagline ?? null)
            : null,
      };
    })
  );

  return (
    <MarketingShell wide>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <h1 className="font-serif text-2xl font-black break-words text-ink-900 sm:text-3xl">
          <T k="account.title" />
        </h1>
        <Link
          href="/new"
          className="btn btn-primary sm:ml-auto"
        >
          <T k="od.create" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="paper p-10 text-center">
          <Seal size={70} className="mx-auto mb-5 opacity-40" idPrefix="acct" />
          <p className="text-sm text-ink-500">
            <T k="account.none" />
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <DepartmentRow
              key={row.dept.slug}
              dept={row.dept}
              liveName={row.liveName}
              liveTagline={row.liveTagline}
            />
          ))}
        </ul>
      )}
    </MarketingShell>
  );
}
