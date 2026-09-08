"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

/**
 * Browser client for OpenDepartment's own project.
 *
 * Uses the default cookie name, which is why departments deliberately override
 * theirs: the control-plane session and a department session must never be
 * able to overwrite one another.
 */
export function createControlBrowserClient() {
  if (typeof window !== "undefined" && client) return client;
  const created = createBrowserClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY!,
    { isSingleton: false }
  );
  if (typeof window !== "undefined") client = created;
  return created;
}

/**
 * Whether the control plane is set up at all.
 *
 * Referenced as whole literals so Next inlines them at build time. Checked
 * before every call above, because a fresh clone with no .env.local should
 * render the wizard and explain itself rather than throw on the first
 * keystroke in the slug field.
 */
export const CONTROL_READY = Boolean(
  process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY
);
