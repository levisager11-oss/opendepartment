import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ signedIn: true, refresh: true }));
vi.mock("@/lib/control/cache", () => ({ resolveDepartmentCached: async () => ({ slug: "pinned", supabase_url: "https://pinned.supabase.co", anon_key: "test-public-key" }) }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[]) => void } }) => ({
    auth: { getUser: async () => {
      if (state.refresh) options.cookies.setAll([{ name: "od-pinned", value: "refreshed", options: { path: "/d/pinned", httpOnly: true } }]);
      return { data: { user: state.signedIn ? { id: "member" } : null } };
    } },
  }),
}));
import { middleware } from "@/middleware";

beforeEach(() => { state.signedIn = true; state.refresh = true; vi.stubEnv("NEXT_PUBLIC_CONTROL_SUPABASE_URL", ""); vi.stubEnv("NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY", ""); });
afterEach(() => vi.unstubAllEnvs());
it("canonicalizes pinned slugs without a control plane", async () => {
  const response = await middleware(new NextRequest("https://archive.test/d/PINNED/vault"));
  expect(response.status).toBe(308);
  expect(response.headers.get("location")).toBe("https://archive.test/d/pinned/vault");
});
it("forwards refreshed cookies to server rendering and the browser", async () => {
  const response = await middleware(new NextRequest("https://archive.test/d/pinned/vault"));
  expect(response.headers.get("x-middleware-request-cookie")).toContain("od-pinned=refreshed");
  expect(response.cookies.get("od-pinned")?.value).toBe("refreshed");
  expect(response.headers.get("content-security-policy")).toContain("'strict-dynamic'");
});
it("preserves refreshed cookies when redirecting a signed-in visitor", async () => {
  const response = await middleware(new NextRequest("https://archive.test/d/pinned/login"));
  expect(response.headers.get("location")).toBe("https://archive.test/d/pinned/vault");
  expect(response.cookies.get("od-pinned")?.value).toBe("refreshed");
});
it("preserves cookies and intended destination on signed-out redirects", async () => {
  state.signedIn = false;
  const response = await middleware(new NextRequest("https://archive.test/d/pinned/vault"));
  expect(response.headers.get("location")).toContain("/d/pinned/login?next=");
  expect(response.cookies.get("od-pinned")?.value).toBe("refreshed");
});
