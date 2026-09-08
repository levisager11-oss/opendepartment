// @vitest-environment jsdom
import { afterAll, describe, expect, it, vi } from "vitest";
import { createTenantBrowserClient } from "@/lib/tenant/client";
import { createControlBrowserClient } from "@/lib/control/browser";

const clients = new Set<ReturnType<typeof createTenantBrowserClient>>();
afterAll(async () => {
  for (const client of clients) await client.auth.stopAutoRefresh();
  vi.unstubAllEnvs();
});

describe("browser database realms", () => {
  it("keeps department clients stable without sharing another department's credentials", () => {
    const a = { slug: "alpha", supabaseUrl: "https://alpha.supabase.co", anonKey: "public-alpha" };
    const b = { slug: "beta", supabaseUrl: "https://beta.supabase.co", anonKey: "public-beta" };
    const alpha = createTenantBrowserClient(a);
    const beta = createTenantBrowserClient(b);
    clients.add(alpha); clients.add(beta);
    expect(alpha).not.toBe(beta);
    expect(createTenantBrowserClient(a)).toBe(alpha);
    expect(createTenantBrowserClient(b)).toBe(beta);
  });

  it("isolates the platform account after a tenant client has already been created", () => {
    vi.stubEnv("NEXT_PUBLIC_CONTROL_SUPABASE_URL", "https://control.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY", "public-control");
    const tenant = createTenantBrowserClient({ slug: "gamma", supabaseUrl: "https://gamma.supabase.co", anonKey: "public-gamma" });
    const control = createControlBrowserClient();
    clients.add(tenant); clients.add(control);
    expect(control).not.toBe(tenant);
    expect(createControlBrowserClient()).toBe(control);
  });

  it("replaces a department client when its project coordinates change", () => {
    const first = createTenantBrowserClient({ slug: "moved", supabaseUrl: "https://old.supabase.co", anonKey: "old-key" });
    const next = createTenantBrowserClient({ slug: "moved", supabaseUrl: "https://new.supabase.co", anonKey: "new-key" });
    clients.add(first); clients.add(next);
    expect(next).not.toBe(first);
  });
});
