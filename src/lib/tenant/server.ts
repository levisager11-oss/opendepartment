import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Department } from "@/lib/control/departments";
import { tenantCookieConfig } from "./cookies";

type CookieBundle = { name: string; value: string; options?: CookieOptions };

export { tenantCookieConfig };

/**
 * Supabase client for a single department, acting as the signed-in visitor.
 *
 * Note what is absent: a service-role key. OpenDepartment is only ever given a
 * department's URL and anon key, so every query below is still filtered by
 * that department's own row level security. Administrator actions go through
 * the `security definer` RPCs in db/tenant-schema.sql, which re-check
 * is_admin() inside the tenant's database.
 */
export async function createTenantClient(dept: Department) {
  const cookieStore = await cookies();
  const cfg = tenantCookieConfig(dept.slug);

  return createServerClient(dept.supabase_url, dept.anon_key, {
    cookieOptions: cfg,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieBundle[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, { ...options, path: cfg.path })
          );
        } catch {
          // Server component: middleware refreshes the session instead.
        }
      },
    },
  });
}
