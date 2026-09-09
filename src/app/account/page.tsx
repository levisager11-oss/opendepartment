import Link from "next/link";
import { redirect } from "next/navigation";
import { createControlClient, CONTROL_CONFIGURED } from "@/lib/control/client";
import { MarketingShell } from "@/components/MarketingShell";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { DepartmentRow } from "@/components/account/DepartmentRow";
import { AccountSignOut } from "@/components/account/AccountSignOut";
import { privatePage } from "@/lib/seo";

export const metadata = privatePage("Your departments", { path: "/account" });

export default async function AccountPage() {
  if (!CONTROL_CONFIGURED) redirect("/");

  const supabase = await createControlClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?next=/account");

  // supabase_url and anon_key ride along so the row can offer "refresh name":
  // the directory keeps a CACHED copy of a department's name, and only the
  // department's own project knows the current one. Both values are public by
  // design -- they are already handed to every visitor of /d/<slug> -- and
  // departments_read_own means an operator only ever sees their own.
  const { data: departments, error } = await supabase
    .from("departments")
    .select(
      "slug, display_name, tagline, visibility, status, created_at, supabase_url, anon_key"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load departments.");

  return (
    <MarketingShell wide>
      <div className="mb-2 flex flex-wrap items-center gap-4">
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

      {/* Under the heading rather than in the shell's navigation: this is the
          only screen the control-plane session is used from, and a sign-out in
          the marketing header would offer itself to every reader who has no
          account at all. */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
        <p className="typewriter text-xs break-all text-ink-500">{user.email}</p>
        <AccountSignOut />
      </div>

      {!departments || departments.length === 0 ? (
        <div className="paper p-10 text-center">
          <Seal size={70} className="mx-auto mb-5 opacity-40" idPrefix="acct" />
          <p className="text-sm text-ink-500">
            <T k="account.none" />
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {departments.map((dept) => (
            <DepartmentRow key={dept.slug} dept={dept} />
          ))}
        </ul>
      )}
    </MarketingShell>
  );
}
