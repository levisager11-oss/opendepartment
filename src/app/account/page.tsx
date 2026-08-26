import Link from "next/link";
import { redirect } from "next/navigation";
import { createControlClient, CONTROL_CONFIGURED } from "@/lib/control/client";
import { MarketingShell } from "@/components/MarketingShell";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { DepartmentRow } from "@/components/account/DepartmentRow";

export const metadata = { title: "Your departments" };

export default async function AccountPage() {
  if (!CONTROL_CONFIGURED) redirect("/");

  const supabase = await createControlClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/account/login?next=/account");

  const { data: departments } = await supabase
    .from("departments")
    .select("slug, display_name, tagline, visibility, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <MarketingShell wide>
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <h1 className="font-[family-name:var(--font-serif)] text-3xl font-black text-ink-900">
          <T k="account.title" />
        </h1>
        <Link
          href="/new"
          className="ml-auto bg-gov-900 px-4 py-2 text-sm font-bold text-white hover:bg-gov-800"
        >
          <T k="od.create" />
        </Link>
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
