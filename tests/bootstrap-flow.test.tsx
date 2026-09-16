// @vitest-environment jsdom
import { webcrypto } from "node:crypto";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeptLoginForm } from "@/components/dept/DeptLoginForm";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { translate, type TranslationKey } from "@/lib/i18n/dictionary";
import { loadBootstrapSecret, isBootstrapSecret } from "@/lib/setup/bootstrap";

const state = vi.hoisted(() => ({
  client: { rpc: vi.fn(), from: vi.fn(), auth: { getUser: vi.fn(), signUp: vi.fn() } },
  router: { push: vi.fn(), refresh: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => state.router, useSearchParams: () => new URLSearchParams() }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/lib/tenant/context", () => ({
  useTenantClient: () => state.client,
  useTenant: () => ({ slug: "demo", supabaseUrl: "https://demo.supabase.co", branding: { openJoin: false }, href: (p: string) => `/d/demo/${p}` }),
}));
vi.mock("@/lib/control/browser", () => ({ CONTROL_READY: true, createControlBrowserClient: () => state.client }));
vi.mock("@/lib/i18n/provider", async () => {
  const { translate } = await import("@/lib/i18n/dictionary");
  const value = { t: (key: TranslationKey, vars?: Record<string, string | number>) => translate("en", key, vars) };
  return { useI18n: () => value };
});

const secret = "ab".repeat(32);
const tr = (key: TranslationKey) => translate("en", key);
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  sessionStorage.clear();
  window.history.replaceState({}, "", "/d/demo/join");
  state.client.auth.signUp.mockResolvedValue({ data: { session: {} }, error: null });
  state.client.auth.getUser.mockResolvedValue({ data: { user: { id: "operator" } } });
  state.client.rpc.mockResolvedValue({ data: true, error: null });
  const owned = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { slug: "demo", supabase_url: "https://demo.supabase.co" } }) };
  owned.select.mockReturnValue(owned); owned.eq.mockReturnValue(owned);
  state.client.from.mockReturnValue(owned);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ available: false, connected: false }) }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function signUp(repeat = "example-password") {
  fireEvent.change(screen.getByLabelText(tr("auth.email")), { target: { value: "owner@example.com" } });
  fireEvent.change(screen.getByLabelText(tr("auth.password")), { target: { value: "example-password" } });
  // Signing up asks twice: the founder is the person for whom a password typed
  // wrong is most expensive, since the way back is a reset mail to a
  // department they have not joined yet.
  fireEvent.change(screen.getByLabelText(tr("auth.repeatPassword")), { target: { value: repeat } });
  fireEvent.click(screen.getByRole("button", { name: tr("auth.signup") }));
}

describe("private founder handoff", () => {
  it("reads and clears the fragment, survives a reload, and sends proof only to tenant signup", async () => {
    window.history.replaceState({}, "", `/d/demo/join#bootstrap=${secret}`);
    const first = render(<DeptLoginForm initialMode="signup" />);
    await waitFor(() => expect(window.location.hash).toBe(""));
    expect(screen.queryByLabelText(tr("invite.code"))).toBeNull();
    first.unmount();
    render(<DeptLoginForm initialMode="signup" />);
    signUp();
    await waitFor(() => expect(state.client.auth.signUp).toHaveBeenCalled());
    expect(state.client.auth.signUp.mock.calls[0][0].options.data.bootstrap_secret).toBe(secret);
    expect(state.client.auth.signUp.mock.calls[0][0].options.emailRedirectTo).not.toContain(secret);
    expect(fetch).not.toHaveBeenCalled();
    cleanup();
    state.client.auth.signUp.mockClear();
    render(<DeptLoginForm initialMode="signup" />);
    signUp();
    await waitFor(() => expect(state.client.auth.signUp).toHaveBeenCalled());
    expect(state.client.auth.signUp.mock.calls[0][0].options.data.bootstrap_secret).toBeUndefined();
  });

  it("restores the private founder link after setup completion is reloaded", async () => {
    window.history.replaceState({}, "", "/new");
    sessionStorage.setItem("od.setup.draft.v1", JSON.stringify({
      name: "Demo", slug: "demo", slugTouched: true, subjectLabel: "Case", docket: "CF",
      visibility: "unlisted", url: "https://demo.supabase.co", anonKey: "public", step: 6,
      bootstrapSecret: secret, completed: true,
    }));
    render(<SetupWizard schemaSql="select 1;" origin="http://localhost" />);
    const link = await screen.findByRole("link", { name: tr("setup.openDept") });
    expect(link.getAttribute("href")).toBe(`/d/demo/join#bootstrap=${secret}`);
    expect(JSON.parse(sessionStorage.getItem("od.setup.draft.v1")!).bootstrapSecret).toBe(secret);
  });

  it("keeps a refused founder signup recoverable and explains an invalid link", async () => {
    window.history.replaceState({}, "", `/d/demo/join#bootstrap=${secret}`);
    state.client.auth.signUp.mockResolvedValue({ data: { session: null }, error: new Error("DEPT_BAD_BOOTSTRAP") });
    render(<DeptLoginForm initialMode="signup" />);
    await screen.findByText(tr("setup.bootstrapPrivate"));
    signUp();
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", tr("auth.bootstrapInvalid"));
    expect(loadBootstrapSecret("demo", "https://demo.supabase.co")).toBe(secret);
    expect(state.router.push).not.toHaveBeenCalled();
  });

  it("clears and rejects malformed founder fragments", async () => {
    window.history.replaceState({}, "", "/d/demo/join#bootstrap=invalid");
    render(<DeptLoginForm initialMode="signup" />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", tr("auth.bootstrapInvalid"));
    expect(window.location.hash).toBe("");
    expect(loadBootstrapSecret("demo", "https://demo.supabase.co")).toBeNull();
    signUp();
    await waitFor(() => expect(state.client.auth.signUp).toHaveBeenCalled());
    expect(state.client.auth.signUp.mock.calls[0][0].options.data.bootstrap_secret).toBeUndefined();
  });

  it("creates a different key for a new draft without losing the old department handoff", async () => {
    sessionStorage.setItem("od.setup.draft.v1", JSON.stringify({
      slug: "demo", url: "https://demo.supabase.co", step: 6, bootstrapSecret: secret, completed: true,
    }));
    render(<SetupWizard schemaSql="select 1;" origin="http://localhost" />);
    fireEvent.click(await screen.findByRole("button", { name: tr("setup.createAnother") }));
    await waitFor(() => {
      const nextDraft = JSON.parse(sessionStorage.getItem("od.setup.draft.v1")!);
      expect(isBootstrapSecret(nextDraft.bootstrapSecret)).toBe(true);
      expect(nextDraft.bootstrapSecret).not.toBe(secret);
      expect(nextDraft.completed).toBe(false);
      expect(nextDraft.step).toBe(1);
      expect(nextDraft.url).toBe("");
    });
    expect(loadBootstrapSecret("demo", "https://demo.supabase.co")).toBe(secret);
  });

  it("requires fresh SQL when an installed draft has lost its founder key", async () => {
    sessionStorage.setItem("od.setup.draft.v1", JSON.stringify({
      slug: "demo", url: "https://demo.supabase.co", step: 6, completed: true,
    }));
    render(<SetupWizard schemaSql="select 1;" origin="http://localhost" />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", tr("setup.bootstrapRefresh"));
    expect(screen.queryByRole("link", { name: tr("setup.openDept") })).toBeNull();
    await waitFor(() => {
      const recovered = JSON.parse(sessionStorage.getItem("od.setup.draft.v1")!);
      expect(recovered.step).toBe(3);
      expect(isBootstrapSecret(recovered.bootstrapSecret)).toBe(true);
    });
  });

  it("does not recreate a consumed founder key when completion is reloaded", async () => {
    sessionStorage.setItem("od.setup.draft.v1", JSON.stringify({
      slug: "demo", url: "https://demo.supabase.co", step: 6, completed: true, founderClaimed: true,
    }));
    render(<SetupWizard schemaSql="select 1;" origin="http://localhost" />);
    const link = await screen.findByRole("link", { name: tr("setup.openDept") });
    expect(link.getAttribute("href")).toBe("/d/demo");
    expect(JSON.parse(sessionStorage.getItem("od.setup.draft.v1")!).bootstrapSecret).toBeUndefined();
  });

  it("recovers the connect controls after registration rejects unexpectedly", async () => {
    sessionStorage.setItem("od.setup.draft.v1", JSON.stringify({
      name: "Demo", slug: "demo", slugTouched: true, url: "https://demo.supabase.co", anonKey: "public", step: 5, bootstrapSecret: secret,
    }));
    state.client.rpc.mockImplementation((name: string) => name === "register_department"
      ? Promise.reject(new Error("offline")) : Promise.resolve({ data: true, error: null }));
    vi.mocked(fetch).mockImplementation(async (input) => ({
      json: async () => String(input).includes("/probe") ? { ok: true, claimed: false } : { available: false, connected: false },
    }) as Response);
    render(<SetupWizard schemaSql="select 1;" origin="http://localhost" />);
    const verify = await screen.findByRole("button", { name: tr("setup.verify") });
    await waitFor(() => expect((verify as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(verify);
    expect(await screen.findByText(tr("common.actionFailed"))).toBeTruthy();
    expect((screen.getByRole("button", { name: tr("setup.verify") }) as HTMLButtonElement).disabled).toBe(false);
    expect(JSON.parse(sessionStorage.getItem("od.setup.draft.v1")!).bootstrapSecret).toBe(secret);
  });

  it("offers account recovery when the session lookup rejects", async () => {
    sessionStorage.setItem("od.setup.draft.v1", JSON.stringify({
      slug: "demo", slugTouched: true, url: "https://demo.supabase.co", anonKey: "public", step: 5, bootstrapSecret: secret,
    }));
    state.client.auth.getUser.mockRejectedValue(new Error("offline"));
    render(<SetupWizard schemaSql="select 1;" origin="http://localhost" />);
    expect(await screen.findByLabelText(tr("auth.email"))).toBeTruthy();
    expect(screen.queryByText(tr("common.loading"))).toBeNull();
    expect(screen.getByText(tr("common.actionFailed"))).toBeTruthy();
  });

  it("resumes a saved completed listing after the owner session is recovered", async () => {
    sessionStorage.setItem("od.setup.draft.v1", JSON.stringify({
      slug: "demo", slugTouched: true, url: "https://demo.supabase.co", anonKey: "public", step: 6, bootstrapSecret: secret, completed: true,
    }));
    const owned = state.client.from();
    owned.maybeSingle.mockResolvedValueOnce({ data: null });
    render(<SetupWizard schemaSql="select 1;" origin="http://localhost" />);
    const verify = await screen.findByRole("button", { name: tr("setup.verify") });
    await waitFor(() => expect((verify as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(verify);
    expect((await screen.findByRole("link", { name: tr("setup.openDept") })).getAttribute("href")).toBe(`/d/demo/join#bootstrap=${secret}`);
    expect(state.client.rpc.mock.calls.some(([name]) => name === "register_department")).toBe(false);
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("/probe"))).toBe(false);
  });
});
