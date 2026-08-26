"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client for OpenDepartment's own project.
 *
 * Uses the default cookie name, which is why departments deliberately override
 * theirs: the control-plane session and a department session must never be
 * able to overwrite one another.
 */
export function createControlBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY!
  );
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
