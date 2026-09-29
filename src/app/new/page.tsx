import { headers } from "next/headers";
import Link from "next/link";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { TENANT_SCHEMA_SQL } from "@/lib/tenant/schema-sql.generated";
import { Wordmark } from "@/components/Logo";
import { LanguageToggle } from "@/components/LanguageToggle";
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
      {/* A header with nothing to click but the way home: somebody halfway
          through setting up a department should not be one tap from leaving. */}
      <header className="masthead gov-rule sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="min-w-0 rounded-control">
            <Wordmark name={<T k="od.name" />} />
          </Link>
          <div className="ml-auto">
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <SetupWizard schemaSql={TENANT_SCHEMA_SQL} origin={origin} />
      </main>
    </>
  );
}
