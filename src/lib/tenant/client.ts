"use client";

import { createBrowserClient } from "@supabase/ssr";
import { tenantCookieConfig } from "./cookies";

const clients = new Map<string, ReturnType<typeof createBrowserClient>>();

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
  const key = JSON.stringify([opts.slug, opts.supabaseUrl, opts.anonKey]);
  const existing = typeof window !== "undefined" ? clients.get(key) : undefined;
  if (existing) return existing;
  const client = createBrowserClient(opts.supabaseUrl, opts.anonKey, {
    // The library singleton ignores URL/key/cookie changes across navigation.
    // Our cache is scoped to the complete department identity instead.
    isSingleton: false,
    cookieOptions: tenantCookieConfig(opts.slug),
  });
  if (typeof window !== "undefined") clients.set(key, client);
  return client;
}
