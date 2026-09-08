import { headers } from "next/headers";
import Link from "next/link";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { TENANT_SCHEMA_SQL } from "@/lib/tenant/schema-sql.generated";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";
import { requestOrigin } from "@/lib/setup/origin";

export const metadata = privatePage("Create a department", {
  path: "/new",
  description:
    "Set up your own OpenDepartment archive on a Supabase project you own.",
});

/**
 * The origin is derived from the incoming request rather than from an env var,
 * so a preview deployment tells owners to whitelist the preview's own callback
 * URL instead of production's. Same reasoning as the single-tenant original.
 */
async function currentOrigin(): Promise<string> {
  return requestOrigin(await headers());
}

export default async function NewDepartmentPage() {
  const origin = await currentOrigin();

  return (
    <>
      <header className="masthead gov-rule">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Seal size={38} idPrefix="new-hdr" />
            <span className="font-serif text-base font-black text-white">
              <T k="od.name" />
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <SetupWizard schemaSql={TENANT_SCHEMA_SQL} origin={origin} />
      </main>
    </>
  );
}
