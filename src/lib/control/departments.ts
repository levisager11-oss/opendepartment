import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { CONTROL_CONFIGURED } from "./client";
import { devDirectory, resolveDevDepartment } from "./dev";

export type Department = {
  slug: string;
  supabase_url: string;
  anon_key: string;
  display_name: string;
  tagline: string | null;
  visibility: "unlisted" | "public";
};

/**
 * Anonymous read-only client for the control plane.
 *
 * Slug resolution happens for signed-out visitors too, so it must not depend
 * on a session. `resolve_department` is security definer and returns only
 * public values, so the anon key is all it ever needs.
 */
function anonControl() {
  return createClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/**
 * Slug -> department. Memoised per request: a single page render resolves the
 * slug in the middleware, the layout and the page, and all three should cost
 * one round trip.
 *
 * Returns null for an unknown or suspended slug. Suspension is enforced inside
 * the SQL function, not here, so there is no code path that forgets it.
 */
export const resolveDepartment = cache(
  async (slug: string): Promise<Department | null> => {
    // The directory is authoritative. Pinned departments only fill gaps, so a
    // department somebody registered through the wizard can never be shadowed
    // by an environment variable.
    if (CONTROL_CONFIGURED) {
      const { data, error } = await anonControl().rpc("resolve_department", {
        want: slug,
      });
      if (!error && data && data.length > 0) return data[0] as Department;
    }

    return resolveDevDepartment(slug);
  }
);

export type DirectoryEntry = {
  slug: string;
  display_name: string;
  tagline: string | null;
  created_at: string;
};

export async function publicDirectory(limit = 60): Promise<DirectoryEntry[]> {
  const dev: DirectoryEntry[] = devDirectory().map((d) => ({
    slug: d.slug,
    display_name: d.display_name,
    tagline: d.tagline,
    created_at: new Date().toISOString(),
  }));

  if (!CONTROL_CONFIGURED) return dev;

  const { data } = await anonControl().rpc("public_directory", {
    limit_to: limit,
  });

  return [...dev, ...((data ?? []) as DirectoryEntry[])];
}
