"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createTenantBrowserClient } from "./client";
import type { Branding } from "./branding";

/**
 * What every client component inside a department needs to know.
 *
 * In the single-tenant original all of this was compiled in from NEXT_PUBLIC_*
 * env vars. Here it is per-request data, so it travels down through context
 * instead -- and a client component that reaches for process.env to find the
 * Supabase URL would silently talk to the wrong department.
 */
export type TenantValue = {
  slug: string;
  supabaseUrl: string;
  anonKey: string;
  branding: Branding;
  /** Path helper: href("vault") -> "/d/my-slug/vault" */
  href: (path?: string) => string;
};

const TenantContext = createContext<TenantValue | null>(null);

export function TenantProvider({
  slug,
  supabaseUrl,
  anonKey,
  branding,
  children,
}: {
  slug: string;
  supabaseUrl: string;
  anonKey: string;
  branding: Branding;
  children: ReactNode;
}) {
  const value = useMemo<TenantValue>(
    () => ({
      slug,
      supabaseUrl,
      anonKey,
      branding,
      href: (path = "") =>
        path ? `/d/${slug}/${path.replace(/^\//, "")}` : `/d/${slug}`,
    }),
    [slug, supabaseUrl, anonKey, branding]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): TenantValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used inside <TenantProvider>");
  return ctx;
}

/** The department's Supabase client, memoised for the life of the component. */
export function useTenantClient() {
  const { slug, supabaseUrl, anonKey } = useTenant();
  return useMemo(
    () => createTenantBrowserClient({ slug, supabaseUrl, anonKey }),
    [slug, supabaseUrl, anonKey]
  );
}
