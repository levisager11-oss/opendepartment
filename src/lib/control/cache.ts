import { createClient } from "@supabase/supabase-js";
import type { Department } from "./departments";
import { resolveDevDepartment } from "./dev";

type Entry = { value: Department | null; expires: number };

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;

/**
 * Process-local slug cache.
 *
 * The middleware resolves a slug on every request into a department, and it
 * cannot share React's per-request cache with the page that renders
 * afterwards. Without this, every navigation would cost two round trips to the
 * control plane instead of one.
 *
 * A minute of staleness is the deliberate trade: it means a newly suspended
 * department can stay reachable for up to a minute, which is acceptable for a
 * directory lookup and is not a security boundary -- the tenant's own RLS is.
 */
const cache = new Map<string, Entry>();

export async function resolveDepartmentCached(
  slug: string
): Promise<Department | null> {
  const key = slug.toLowerCase();
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value;

  if (
    !process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY
  ) {
    return resolveDevDepartment(key);
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await anon.rpc("resolve_department", { want: key });

  // Same precedence as resolveDepartment: the directory wins, pins fill gaps.
  // The middleware and the page must never disagree about which project a slug
  // belongs to.
  const value: Department | null =
    error || !data || data.length === 0
      ? resolveDevDepartment(key)
      : (data[0] as Department);

  if (cache.size >= MAX_ENTRIES) {
    // Cheap eviction: drop the oldest insertion. Map preserves insertion order.
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expires: now + TTL_MS });

  return value;
}
