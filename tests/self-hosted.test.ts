import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/control/cache", () => ({ resolveDepartmentCached: async () => null }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));

/**
 * dev.ts parses STATIC_DEPARTMENTS once per process, so every case gets a
 * fresh module graph with its own environment rather than inheriting whatever
 * the previous case pinned.
 */
async function load(pins: Record<string, { url: string; key: string }>, control = "") {
  vi.stubEnv("STATIC_DEPARTMENTS", JSON.stringify(pins));
  vi.stubEnv("NEXT_PUBLIC_CONTROL_SUPABASE_URL", control);
  vi.stubEnv("NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY", control ? "public-control-key" : "");
  vi.resetModules();
  const dev = await import("@/lib/control/dev");
  const { proxy } = await import("@/proxy");
  const csp = async () =>
    (await proxy(new NextRequest("https://archive.test/"))).headers.get("content-security-policy") ?? "";
  return { ...dev, csp };
}

function directive(policy: string, name: string): string {
  return policy.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";
}

beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => {}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("accepts a bare https origin, cloud or self-hosted, and loopback http", async () => {
  const { pinnedOrigin } = await load({});
  expect(pinnedOrigin("https://abcdefghijkl.supabase.co")).toBe("https://abcdefghijkl.supabase.co");
  expect(pinnedOrigin("https://Supabase.Example.org/")).toBe("https://supabase.example.org");
  expect(pinnedOrigin("https://supabase.example.org:8443")).toBe("https://supabase.example.org:8443");
  expect(pinnedOrigin("http://localhost:54321")).toBe("http://localhost:54321");
  expect(pinnedOrigin("http://127.0.0.1:54321/")).toBe("http://127.0.0.1:54321");
  expect(pinnedOrigin("http://[::1]:8000")).toBe("http://[::1]:8000");
});

it("refuses plain http off the loopback, paths, credentials and non-web schemes", async () => {
  const { pinnedOrigin } = await load({});
  for (const bad of [
    "http://supabase.example.org",
    "http://10.0.0.5:8000",
    "https://supabase.example.org/rest/v1",
    "https://supabase.example.org/?x=1",
    "https://supabase.example.org/#frag",
    "https://user:secret@supabase.example.org",
    "javascript:alert(1)",
    "ftp://supabase.example.org",
    "not a url",
    "",
  ]) {
    expect(pinnedOrigin(bad), bad).toBeNull();
  }
});

it("pins a self-hosted department by its origin and skips an unsafe one", async () => {
  const { resolveDevDepartment, selfHostedOrigins } = await load({
    cloud: { url: "https://abcdefghijkl.supabase.co", key: "k" },
    home: { url: "https://supabase.example.org/", key: "k" },
    plain: { url: "http://supabase.example.net", key: "k" },
  });
  expect(resolveDevDepartment("home")?.supabase_url).toBe("https://supabase.example.org");
  expect(resolveDevDepartment("plain")).toBeNull();
  expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('"plain" was skipped'));
  // The cloud is already in the policy; only the servers people run are added.
  expect(selfHostedOrigins()).toEqual(["https://supabase.example.org"]);
});

it("lets the browser reach a self-hosted project and nothing that was refused", async () => {
  const { csp } = await load({
    home: { url: "https://supabase.example.org", key: "k" },
    plain: { url: "http://evil.example", key: "k" },
  });
  const policy = await csp();
  for (const name of ["connect-src", "img-src", "media-src"]) {
    expect(directive(policy, name)).toContain("https://*.supabase.co");
    expect(directive(policy, name)).toContain("https://supabase.example.org");
  }
  expect(policy).not.toContain("evil.example");
  expect(policy).toContain("upgrade-insecure-requests");
});

it("adds a self-hosted control plane too", async () => {
  const { csp } = await load({}, "https://control.example.org");
  expect(directive(await csp(), "connect-src")).toContain("https://control.example.org");
});

it("drops upgrade-insecure-requests only for a loopback project", async () => {
  const cloudOnly = await load({ cloud: { url: "https://abcdefghijkl.supabase.co", key: "k" } });
  expect(await cloudOnly.csp()).toContain("upgrade-insecure-requests");
  expect(directive(await cloudOnly.csp(), "connect-src")).toBe(
    "connect-src 'self' https://*.supabase.co https://*.supabase.in"
  );

  const local = await load({ local: { url: "http://127.0.0.1:54321", key: "k" } });
  const policy = await local.csp();
  expect(directive(policy, "connect-src")).toContain("http://127.0.0.1:54321");
  expect(policy).not.toContain("upgrade-insecure-requests");
});
