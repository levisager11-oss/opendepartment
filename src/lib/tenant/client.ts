"use client";

import { createBrowserClient } from "@supabase/ssr";
import { tenantCookieConfig } from "./cookies";

/**
 * Browser-side client for one department.
 *
 * The credentials arrive as props from the server layout rather than from
 * NEXT_PUBLIC_* env vars, because which Supabase project to talk to is decided
 * per request by the slug, not at build time.
 */
export function createTenantBrowserClient(opts: {
  slug: string;
  supabaseUrl: string;
  anonKey: string;
}) {
  return createBrowserClient(opts.supabaseUrl, opts.anonKey, {
    cookieOptions: tenantCookieConfig(opts.slug),
  });
}
