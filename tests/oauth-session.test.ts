import { afterEach, expect, it, vi } from "vitest";
import { managementToken, seal, sealManagementToken, unseal, pkce, safeReturn } from "@/lib/setup/oauth-session";
import { createHash } from "node:crypto";
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

it("binds the Management API token to its account and server-enforced lifetime", () => {
  vi.stubEnv("SUPABASE_OAUTH_CLIENT_SECRET", "synthetic-unit-test-secret");
  vi.useFakeTimers();
  const sealed = sealManagementToken("test-token", "operator-a");
  expect(managementToken(sealed, "operator-a")).toBe("test-token");
  expect(managementToken(sealed, "operator-b")).toBeNull();
  expect(managementToken(seal("legacy-raw-token"), "operator-a")).toBeNull();
  vi.advanceTimersByTime(3_600_000);
  expect(managementToken(sealed, "operator-a")).toBeNull();
});
it("rejects tampered, malformed, and rotated-key envelopes", () => {
  vi.stubEnv("SUPABASE_OAUTH_CLIENT_SECRET", "test-key-one");
  const value = seal("test-value");
  const [iv, tag, body] = value.split(".");
  expect(unseal(value)).toBe("test-value");
  expect(unseal(`${iv}.${tag}.${body}.extra`)).toBeNull();
  expect(unseal(`${iv}.${tag}.${body[0] === "A" ? "B" : "A"}${body.slice(1)}`)).toBeNull();
  vi.stubEnv("SUPABASE_OAUTH_CLIENT_SECRET", "test-key-two");
  expect(unseal(value)).toBeNull();
});
it("uses S256 PKCE and a bounded OAuth return allowlist", () => {
  const { verifier, challenge } = pkce();
  expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
  expect(safeReturn("/account")).toBe("/account");
  expect(safeReturn("//example.test")).toBe("/new");
});
