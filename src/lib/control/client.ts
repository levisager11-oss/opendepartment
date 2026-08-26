import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieBundle = { name: string; value: string; options?: CookieOptions };

/** Whether OpenDepartment's own control-plane credentials are configured. */
export const CONTROL_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY
);

/**
 * Client for OpenDepartment's own Supabase project -- the directory that maps
 * a slug to somebody else's project. Never holds department content.
 */
export async function createControlClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieBundle[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component: middleware refreshes the session instead.
          }
        },
      },
    }
  );
}
