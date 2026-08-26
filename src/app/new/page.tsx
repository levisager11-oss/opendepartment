import { headers } from "next/headers";
import Link from "next/link";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { TENANT_SCHEMA_SQL } from "@/lib/tenant/schema-sql.generated";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";

/**
 * The origin is derived from the incoming request rather than from an env var,
 * so a preview deployment tells owners to whitelist the preview's own callback
 * URL instead of production's. Same reasoning as the single-tenant original.
 */
async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function NewDepartmentPage() {
  const origin = await currentOrigin();

  return (
    <>
      <header className="masthead gov-rule">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Seal size={38} idPrefix="new-hdr" />
            <span className="font-[family-name:var(--font-serif)] text-base font-black text-white">
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
