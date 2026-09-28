import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock("@/lib/control/client", () => ({
  CONTROL_CONFIGURED: true,
  createControlClient: async () => ({ auth: { exchangeCodeForSession: state.exchange } }),
}));
import { GET } from "@/app/account/auth/callback/route";

const call = (query: string) =>
  GET(new NextRequest(`https://archive.test/account/auth/callback${query}`, {
    headers: { host: "archive.test", "x-forwarded-proto": "https" },
  }));

beforeEach(() => state.exchange.mockReset());

it("signs an operator in from a confirmation link and lands on their account", async () => {
  state.exchange.mockResolvedValue({ error: null });
  const response = await call("?code=abc&next=/account");
  expect(state.exchange).toHaveBeenCalledWith("abc");
  expect(response.headers.get("location")).toBe("https://archive.test/account");
});

it("forwards a reset link to the page that actually changes the password", async () => {
  state.exchange.mockResolvedValue({ error: null });
  const response = await call(`?code=abc&next=${encodeURIComponent("/account/auth/update-password")}`);
  expect(response.headers.get("location")).toBe("https://archive.test/account/auth/update-password");
});

it("never forwards outside /account once the operator is authenticated", async () => {
  state.exchange.mockResolvedValue({ error: null });
  for (const next of ["//evil.test", "/d/someone/vault", "https://evil.test/account"]) {
    const response = await call(`?code=abc&next=${encodeURIComponent(next)}`);
    expect(response.headers.get("location")).toBe("https://archive.test/account");
  }
});

it("says the link failed rather than dropping the operator on the home page", async () => {
  state.exchange.mockResolvedValue({ error: { message: "code verifier missing" } });
  expect((await call("?code=abc")).headers.get("location"))
    .toBe("https://archive.test/account/login?error=link");
  expect((await call("")).headers.get("location"))
    .toBe("https://archive.test/account/login?error=link");
});
