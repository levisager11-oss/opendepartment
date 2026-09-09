// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { translate, type TranslationKey } from "@/lib/i18n/dictionary";
import { VaultBrowser } from "@/components/dept/VaultBrowser";
import { UploadForm } from "@/components/dept/UploadForm";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminInvites } from "@/components/admin/AdminInvites";
import { DepartmentRow } from "@/components/account/DepartmentRow";
import { DeptLoginForm } from "@/components/dept/DeptLoginForm";
import { FileViewer } from "@/components/dept/FileViewer";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { ControlAuthPanel } from "@/components/setup/ControlAuthPanel";
import { AdminStorage } from "@/components/admin/AdminStorage";
import { CommentSection } from "@/components/dept/CommentSection";
import { AdminDanger } from "@/components/admin/AdminDanger";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminFiles } from "@/components/admin/AdminFiles";
import { DeptHeader } from "@/components/dept/DeptHeader";
import { DeleteFileButton } from "@/components/dept/DeleteFileButton";
import { AccountSignOut } from "@/components/account/AccountSignOut";
import { DeptLeaveForm } from "@/components/dept/DeptLeaveForm";

const runtime = vi.hoisted(() => ({
  query: "",
  router: { push: vi.fn(), refresh: vi.fn() },
  client: {
    from: vi.fn(), rpc: vi.fn(),
    auth: { getUser: vi.fn(), resetPasswordForEmail: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() },
    storage: { from: vi.fn() },
  },
  storage: { upload: vi.fn(), remove: vi.fn(), createSignedUrls: vi.fn() },
  tenant: {
    slug: "demo", supabaseUrl: "https://demo.supabase.co",
    branding: { subjectLabel: "Case", categories: ["EXHIBIT", "MEMO"], maxUploadMb: 25, openJoin: false },
    href: (path = "") => `/d/demo${path ? `/${path}` : ""}`,
  },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => runtime.router,
  usePathname: () => "/d/demo/vault",
  useSearchParams: () => new URLSearchParams(runtime.query),
}));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.ComponentProps<"a">) => <a href={href} {...props}>{children}</a> }));
vi.mock("@/lib/i18n/provider", async () => {
  const { translate } = await import("@/lib/i18n/dictionary");
  const value = {
    t: (key: TranslationKey, vars?: Record<string, string | number>) => translate("en", key, vars),
    plural: (_base: string, n: number) => `${n} documents`, formatDate: (value: string) => value,
  };
  return { useI18n: () => value };
});
vi.mock("@/lib/tenant/context", () => ({ useTenant: () => runtime.tenant, useTenantClient: () => runtime.client }));
vi.mock("@/lib/control/browser", () => ({ CONTROL_READY: true, createControlBrowserClient: () => runtime.client }));
vi.mock("@/components/dept/FileCard", () => ({ FileCard: ({ file }: { file: { title: string } }) => <article>{file.title}</article> }));
vi.mock("@/lib/tenant/scrub", () => ({ scrubImage: async (file: File) => ({ file, scrubbed: false, unsupported: false }) }));

type Result = { data?: unknown; error?: unknown; count?: number };
function query(result: Result | Promise<Result>) {
  const builder = {
    select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(), range: vi.fn(),
    or: vi.fn(), insert: vi.fn(), upsert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    single: vi.fn(), maybeSingle: vi.fn(),
    then: (resolve: (value: Result) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };
  for (const [name, fn] of Object.entries(builder)) if (name !== "then") (fn as ReturnType<typeof vi.fn>).mockReturnValue(builder);
  return builder;
}
function deferred() {
  let resolve!: (result: Result) => void;
  const promise = new Promise<Result>((done) => { resolve = done; });
  return { promise, resolve };
}
const tr = (key: TranslationKey) => translate("en", key);
const row = (n: number, title = `Document ${n}`) => ({ id: `file-${n}`, title, kind: "pdf", storage_path: `${n}.pdf` });
const reports = [{ id: "report-1", file_id: null, reporter_id: "member", reason: "other", details: null, status: "open", created_at: "2026-01-01", file_title: null, reporter_username: "Member" }];
const invites = [{ code: "ABC-DEF-GHJ", note: null, max_uses: null, uses: 0, grants_admin: false, expires_at: null, created_at: "2026-01-01" }];
const dept = { slug: "demo", display_name: "Demo", tagline: null, visibility: "unlisted", status: "active", created_at: "2026-01-01", supabase_url: "https://demo.supabase.co", anon_key: "public" };

beforeEach(() => {
  vi.resetAllMocks();
  runtime.query = "";
  window.history.replaceState({}, "", "/d/demo/vault");
  sessionStorage.clear();
  runtime.client.storage.from.mockReturnValue(runtime.storage);
  runtime.storage.upload.mockResolvedValue({ error: null });
  runtime.storage.remove.mockResolvedValue({ error: null });
  runtime.storage.createSignedUrls.mockResolvedValue({ data: [] });
  runtime.client.auth.getUser.mockResolvedValue({ data: { user: { id: "member" } } });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("archive filters and pagination", () => {
  it("discards an older filter result whose vote lookup finishes last", async () => {
    const oldVotes = deferred();
    let fileCalls = 0;
    let voteCalls = 0;
    runtime.client.from.mockImplementation((table: string) => {
      if (table === "files_public") return query({ data: [row(++fileCalls, fileCalls === 1 ? "Old result" : "Current result")], count: 1 });
      return query(++voteCalls === 1 ? oldVotes.promise : { data: [] });
    });
    render(<VaultBrowser subjects={[]} currentUserId="member" />);
    await waitFor(() => expect(voteCalls).toBe(1));
    fireEvent.change(screen.getByRole("combobox", { name: tr("vault.sort") }), { target: { value: "new" } });
    expect(await screen.findByText("Current result")).toBeTruthy();
    await act(async () => { oldVotes.resolve({ data: [] }); });
    expect(screen.queryByText("Old result")).toBeNull();
    expect(screen.getByText("Current result")).toBeTruthy();
  });

  it("retries pagination from a consistent page and never skips the failed page", async () => {
    const first = Array.from({ length: 24 }, (_, i) => row(i + 1));
    const second = Array.from({ length: 24 }, (_, i) => row(i + 25));
    const responses = [
      query({ data: first, count: 60 }), query({ error: { message: "offline" } }),
      query({ data: first, count: 60 }), query({ data: second, count: 60 }),
    ];
    let calls = 0;
    runtime.client.from.mockImplementation((table: string) => table === "files_public" ? responses[calls++] : query({ data: [] }));
    render(<VaultBrowser subjects={[]} currentUserId="member" />);
    fireEvent.click(await screen.findByRole("button", { name: /Load more documents/ }));
    fireEvent.click(await screen.findByRole("button", { name: tr("common.retry") }));
    fireEvent.click(await screen.findByRole("button", { name: /Load more documents/ }));
    expect(await screen.findByText("Document 25")).toBeTruthy();
    expect(responses.map((r) => r.range.mock.calls[0])).toEqual([[0, 23], [24, 47], [0, 23], [24, 47]]);
  });

  it("restores shared filters, clears all of them, and follows browser history", async () => {
    window.history.replaceState({}, "", "/d/demo/vault?q=letter&sort=new&subject=case-a&category=MEMO&kind=pdf&mine=1");
    runtime.client.from.mockImplementation((table: string) => query(table === "file_subjects" ? { data: [{ file_id: "file-1" }] } : { data: [], count: 0 }));
    render(<VaultBrowser subjects={[{ id: "case-a", name: "Case A" }]} currentUserId="member" />);
    expect((screen.getByRole("textbox", { name: tr("vault.search") }) as HTMLInputElement).value).toBe("letter");
    expect((screen.getByRole("combobox", { name: tr("vault.sort") }) as HTMLSelectElement).value).toBe("new");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: tr("vault.clear") }));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect((screen.getByRole("combobox", { name: tr("vault.sort") }) as HTMLSelectElement).value).toBe("top");
    act(() => {
      window.history.pushState({}, "", "/d/demo/vault?q=restored&kind=audio");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect((screen.getByRole("textbox", { name: tr("vault.search") }) as HTMLInputElement).value).toBe("restored");
    expect((screen.getByRole("combobox", { name: tr("vault.filter.kind") }) as HTMLSelectElement).value).toBe("audio");
  });

  it("shows a failed subject lookup as an error instead of an empty archive", async () => {
    window.history.replaceState({}, "", "/d/demo/vault?subject=case-a");
    runtime.client.from.mockReturnValue(query({ error: { message: "offline" } }));
    render(<VaultBrowser subjects={[{ id: "case-a", name: "Case A" }]} currentUserId="member" />);
    expect(await screen.findByRole("button", { name: tr("common.retry") })).toBeTruthy();
    expect(screen.queryByText(tr("vault.empty"))).toBeNull();
  });
});

describe("upload recovery", () => {
  async function fillUpload() {
    fireEvent.change(screen.getByLabelText(tr("upload.dropzone")), { target: { files: [new File(["pdf"], "exhibit.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect((screen.getByLabelText(tr("upload.fileTitle")) as HTMLInputElement).value).toBe("exhibit"));
    fireEvent.click(screen.getByRole("button", { name: "Case A" }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: tr("upload.submit") }));
  }
  it("retries only the subject links after a partial write, without uploading a duplicate", async () => {
    const files = query({ data: { id: "saved-file" }, error: null });
    const refused = query({ error: { message: "response interrupted" } });
    const retried = query({ error: null });
    let subjectCalls = 0;
    runtime.client.from.mockImplementation((table: string) => table === "files" ? files : ++subjectCalls === 1 ? refused : retried);
    render(<UploadForm userId="member" subjects={[{ id: "case-a", name: "Case A" }]} />);
    await fillUpload();
    expect((await screen.findByRole("alert")).textContent).toBe(tr("upload.savedNeedsSubjects"));
    expect(screen.getByRole("link", { name: tr("upload.openSavedFile") }).getAttribute("href")).toBe("/d/demo/file/saved-file");
    fireEvent.click(screen.getByRole("button", { name: tr("upload.retrySubjects") }));
    await waitFor(() => expect(runtime.router.push).toHaveBeenCalledWith("/d/demo/file/saved-file"));
    expect(runtime.storage.upload).toHaveBeenCalledTimes(1);
    expect(files.insert).toHaveBeenCalledTimes(1);
    expect(retried.upsert).toHaveBeenCalledWith([{ file_id: "saved-file", subject_id: "case-a" }], { onConflict: "file_id,subject_id", ignoreDuplicates: true });
  });
  it("recognizes a database quota error and cleans up its uploaded object", async () => {
    runtime.client.from.mockReturnValueOnce(query({ error: { code: "P0001", message: "QUOTA_EXCEEDED" } }))
      .mockReturnValueOnce(query({ data: null, error: null }));
    render(<UploadForm userId="member" subjects={[{ id: "case-a", name: "Case A" }]} />);
    await fillUpload();
    expect((await screen.findByRole("alert")).textContent).toBe(tr("upload.errorQuota"));
    expect(runtime.storage.remove).toHaveBeenCalledTimes(1);
  });
  it("recovers a committed file after a lost insert response without removing its bytes", async () => {
    const insert = query({ error: { message: "Failed to fetch", code: "" } });
    const readback = query({ data: { id: "committed-file" }, error: null });
    runtime.client.from.mockReturnValueOnce(insert).mockReturnValueOnce(readback).mockReturnValue(query({ error: null }));
    render(<UploadForm userId="member" subjects={[{ id: "case-a", name: "Case A" }]} />);
    await fillUpload();
    await waitFor(() => expect(runtime.router.push).toHaveBeenCalledWith("/d/demo/file/committed-file"));
    expect(readback.eq).toHaveBeenCalledWith("storage_path", runtime.storage.upload.mock.calls[0][0]);
    expect(runtime.storage.remove).not.toHaveBeenCalled();
    expect(runtime.storage.upload).toHaveBeenCalledTimes(1);
  });
  it("preserves an uncertain insert and retries the same unique path without a second upload", async () => {
    const insert = query({ error: { message: "Failed to fetch", code: "" } });
    const unavailable = query({ data: null, error: { message: "offline" } });
    const absent = query({ data: null, error: null });
    const retryInsert = query({ data: { id: "recovered-file" }, error: null });
    runtime.client.from.mockReturnValueOnce(insert).mockReturnValueOnce(unavailable)
      .mockReturnValueOnce(absent).mockReturnValueOnce(retryInsert).mockReturnValue(query({ error: null }));
    render(<UploadForm userId="member" subjects={[{ id: "case-a", name: "Case A" }]} />);
    await fillUpload();
    expect((await screen.findByRole("alert")).textContent).toBe(tr("upload.confirmSave"));
    expect(runtime.storage.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: tr("common.retry") }));
    await waitFor(() => expect(runtime.router.push).toHaveBeenCalledWith("/d/demo/file/recovered-file"));
    expect(runtime.storage.upload).toHaveBeenCalledTimes(1);
    expect(retryInsert.insert).toHaveBeenCalledWith(insert.insert.mock.calls[0][0]);
    expect(runtime.storage.remove).not.toHaveBeenCalled();
  });
});

describe("action refusal feedback", () => {
  it("keeps a refused comment while preserving a parallel successful deletion", async () => {
    const refused = deferred();
    const removed = deferred();
    runtime.client.from.mockReturnValueOnce(query(refused.promise)).mockReturnValueOnce(query(removed.promise));
    render(<CommentSection fileId="file-1" currentUserId="member" currentUsername="Member" isAdmin={false}
      initialComments={["first", "second"].map((id) => ({ id, file_id: "file-1", author_id: "member", body: `${id} note`, created_at: "2026-01-01", author_username: "Member" }))} />);
    const buttons = screen.getAllByRole("button", { name: tr("comments.delete") });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    await act(async () => { removed.resolve({ data: [{ id: "second" }], error: null }); });
    expect(screen.queryByText("second note")).toBeNull();
    await act(async () => { refused.resolve({ data: [], error: null }); });
    expect(screen.queryByText("second note")).toBeNull();
    expect(screen.getByText("first note")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(tr("common.actionFailed"));
    expect((screen.getByRole("button", { name: tr("comments.delete") }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("excludes new uploads and rechecks displayed orphans before removing storage", async () => {
    const old = (path: string) => ({ path, size_bytes: 10, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() });
    const recent = { ...old("recent.pdf"), created_at: new Date().toISOString() };
    let lists = 0;
    runtime.client.rpc.mockImplementation((name: string) => Promise.resolve({
      data: name === "admin_storage_usage" ? [] : ++lists === 1
        ? [old("still-orphan.pdf"), old("now-filed.pdf"), recent]
        : lists === 2 ? [old("still-orphan.pdf"), old("not-displayed.pdf"), recent] : [],
      error: null,
    }));
    render(<AdminStorage />);
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(tr("settings.orphansPurge")) }));
    await waitFor(() => expect(runtime.storage.remove).toHaveBeenCalledWith(["still-orphan.pdf"]));
    expect(runtime.storage.remove).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("recent.pdf")).toBeNull();
  });

  it("refuses orphan removal when its immediate recheck fails", async () => {
    let lists = 0;
    runtime.client.rpc.mockImplementation((name: string) => Promise.resolve(name === "admin_storage_usage"
      ? { data: [], error: null }
      : ++lists === 1 ? { data: [{ path: "orphan.pdf", size_bytes: 10, created_at: "2020-01-01" }], error: null }
        : { data: null, error: { message: "offline" } }));
    render(<AdminStorage />);
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(tr("settings.orphansPurge")) }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect(runtime.storage.remove).not.toHaveBeenCalled();
  });

  it("completes file deletion without updating a report that cascaded with it", async () => {
    runtime.client.rpc.mockResolvedValue({ data: "member/exhibit.pdf", error: null });
    render(<AdminReports reports={[{ ...reports[0], file_id: "file-1" }]} />);
    fireEvent.click(screen.getByRole("button", { name: tr("admin.reports.deleteFile") }));
    expect((await screen.findByRole("status")).textContent).toBe(tr("common.done"));
    expect(runtime.storage.remove).toHaveBeenCalledWith(["member/exhibit.pdf"]);
    expect(runtime.client.from).not.toHaveBeenCalled();
    expect(runtime.router.refresh).toHaveBeenCalledTimes(1);
  });
  it.each([{ data: [] }, { data: null, error: { message: "permission denied" } }])("keeps a refused report action visible: %j", async (response) => {
    runtime.client.from.mockReturnValue(query(response));
    render(<AdminReports reports={reports} />);
    fireEvent.click(screen.getByRole("button", { name: tr("admin.reports.resolve") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect(runtime.router.refresh).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: tr("admin.reports.resolve") }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("does not claim an invite was revoked when no row was deleted", async () => {
    runtime.client.from.mockReturnValue(query({ data: [], error: null }));
    render(<AdminInvites invites={invites} />);
    fireEvent.click(screen.getByRole("button", { name: tr("invite.revoke") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect(runtime.router.refresh).not.toHaveBeenCalled();
    expect(screen.getByText(invites[0].code)).toBeTruthy();
  });
  it("offers a selectable invite link when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<AdminInvites invites={invites} />);
    fireEvent.click(screen.getByRole("button", { name: tr("invite.link") }));
    const fallback = await screen.findByRole("textbox", { name: tr("invite.link") });
    expect((fallback as HTMLInputElement).value).toContain("/d/demo/join?code=ABC-DEF-GHJ");
  });
  it("preserves the actual listing visibility when a zero-row update is refused", async () => {
    runtime.client.from.mockReturnValue(query({ data: [], error: null }));
    render(<DepartmentRow dept={dept} />);
    fireEvent.click(screen.getByRole("button", { name: tr("setup.unlisted") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect(screen.queryByRole("button", { name: tr("setup.public") })).toBeNull();
    expect(runtime.router.refresh).not.toHaveBeenCalled();
  });
  it("lets an owner dismiss a failed deletion and try again", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ available: false, connected: false }) }));
    runtime.client.from.mockReturnValue(query({ data: [], error: null }));
    render(<DepartmentRow dept={dept} />);
    fireEvent.click(screen.getByRole("button", { name: tr("delete.open") }));
    await screen.findByText(tr("delete.noOauth"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "demo" } });
    fireEvent.click(screen.getByRole("button", { name: tr("delete.go") }));
    await screen.findByText(tr("delete.listingFailed"));
    fireEvent.click(screen.getByRole("button", { name: tr("delete.dismiss") }));
    expect(screen.getByRole("button", { name: tr("delete.open") })).toBeTruthy();
  });
});

describe("authentication and previews", () => {
  it("does not say a reset link was sent after a provider failure", async () => {
    runtime.client.auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "rate limited" } });
    render(<DeptLoginForm initialMode="reset" />);
    fireEvent.change(screen.getByLabelText(tr("auth.email")), { target: { value: "member@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: tr("auth.reset") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect(screen.queryByText(tr("auth.resetSent"))).toBeNull();
  });
  it("explains an unsuccessful authentication callback", () => {
    runtime.query = "error=auth";
    render(<DeptLoginForm />);
    expect(screen.getByRole("alert").textContent).toBe(tr("auth.linkInvalid"));
  });
  it("provides an explicit preview retry and recovers when a fresh URL arrives", () => {
    const view = render(<FileViewer kind="image" url={null} title="Exhibit" />);
    expect(screen.getByRole("alert").textContent).toBe(tr("file.previewFailed"));
    fireEvent.click(screen.getByRole("button", { name: tr("common.retry") }));
    expect(runtime.router.refresh).toHaveBeenCalledTimes(1);
    view.rerender(<FileViewer kind="image" url="https://storage.example/old" title="Exhibit" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("alert")).toBeTruthy();
    view.rerender(<FileViewer kind="image" url="https://storage.example/fresh" title="Exhibit" />);
    expect(screen.getByRole("img").getAttribute("src")).toBe("https://storage.example/fresh");
  });
  it("ends the OpenDepartment account session and leaves the account screen", async () => {
    runtime.client.auth.signOut.mockResolvedValue({ error: null });
    render(<AccountSignOut />);
    fireEvent.click(screen.getByRole("button", { name: tr("nav.signout") }));
    await waitFor(() => expect(runtime.client.auth.signOut).toHaveBeenCalledTimes(1));
    // Anywhere but /account: the middleware would bounce that to the login
    // screen, which is a confusing answer to having just signed out.
    expect(runtime.router.push).toHaveBeenCalledWith("/");
  });
  it("says so rather than pretending when signing out of the account fails", async () => {
    runtime.client.auth.signOut.mockResolvedValue({ error: { message: "offline" } });
    render(<AccountSignOut />);
    fireEvent.click(screen.getByRole("button", { name: tr("nav.signout") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect(runtime.router.push).not.toHaveBeenCalled();
  });
  it("refuses to erase a membership until the confirmation matches", () => {
    render(<DeptLeaveForm username="auditmember" />);
    fireEvent.click(screen.getByRole("button", { name: tr("leave.start") }));
    const submit = screen.getByRole("button", { name: tr("leave.submit") }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(translate("en", "leave.confirmLabel", { name: "auditmember" })),
      { target: { value: "auditmember" } });
    expect((screen.getByRole("button", { name: tr("leave.submit") }) as HTMLButtonElement).disabled).toBe(false);
    expect(runtime.client.rpc).not.toHaveBeenCalled();
  });
  it("explains that the last administrator cannot leave, without signing them out", async () => {
    runtime.client.rpc.mockResolvedValue({ data: null, error: { message: "LAST_ADMIN" } });
    render(<DeptLeaveForm username="auditadmin" />);
    fireEvent.click(screen.getByRole("button", { name: tr("leave.start") }));
    fireEvent.change(screen.getByLabelText(translate("en", "leave.confirmLabel", { name: "auditadmin" })),
      { target: { value: "auditadmin" } });
    fireEvent.click(screen.getByRole("button", { name: tr("leave.submit") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("leave.lastAdmin"));
    expect(runtime.client.auth.signOut).not.toHaveBeenCalled();
  });
  it("removes the objects a departure hands back before the session ends", async () => {
    runtime.client.rpc.mockResolvedValue({
      data: { files: 1, account: "deleted", storage_paths: ["me/one.png"] }, error: null,
    });
    runtime.storage.remove.mockResolvedValue({ error: null });
    runtime.client.auth.signOut.mockResolvedValue({ error: null });
    render(<DeptLeaveForm username="auditleaver" />);
    fireEvent.click(screen.getByRole("button", { name: tr("leave.start") }));
    fireEvent.change(screen.getByLabelText(translate("en", "leave.confirmLabel", { name: "auditleaver" })),
      { target: { value: "auditleaver" } });
    fireEvent.click(screen.getByRole("button", { name: tr("leave.submit") }));
    // The member's own session is the only thing allowed to delete their
    // folder, so the objects have to go before it ends.
    await waitFor(() => expect(runtime.storage.remove).toHaveBeenCalledWith(["me/one.png"]));
    await waitFor(() => expect(runtime.client.auth.signOut).toHaveBeenCalledTimes(1));
  });
  it("keeps a departure whose objects survived visible to the member", async () => {
    runtime.client.rpc.mockResolvedValue({
      data: { files: 1, account: "deleted", storage_paths: ["me/one.png"] }, error: null,
    });
    runtime.storage.remove.mockResolvedValue({ error: { message: "denied" } });
    render(<DeptLeaveForm username="auditleaver" />);
    fireEvent.click(screen.getByRole("button", { name: tr("leave.start") }));
    fireEvent.change(screen.getByLabelText(translate("en", "leave.confirmLabel", { name: "auditleaver" })),
      { target: { value: "auditleaver" } });
    fireEvent.click(screen.getByRole("button", { name: tr("leave.submit") }));
    expect((await screen.findByRole("status")).textContent).toBe(tr("leave.doneObjectsLeft"));
    // Not signed out behind their back: the notice is for an administrator and
    // they have to be able to read it.
    expect(runtime.client.auth.signOut).not.toHaveBeenCalled();
  });
  it("renders a document in a frame that cannot run what it is served", () => {
    // Storage returns the Content-Type the uploader supplied, so an exhibit
    // filed as a PDF can arrive as text/html. The sandbox is what makes that
    // inert: no allow-scripts, and no allow-same-origin to escape through.
    const { container } = render(
      <FileViewer kind="pdf" url="https://storage.example/exhibit.pdf" title="Exhibit" />
    );
    const frame = container.querySelector("iframe");
    expect(frame).toBeTruthy();
    const sandbox = frame!.getAttribute("sandbox") ?? "";
    expect(sandbox.split(/\s+/)).not.toContain("allow-scripts");
    expect(sandbox.split(/\s+/)).not.toContain("allow-same-origin");
    // An <object> honours the response type over its own attribute, which is
    // the element this replaced.
    expect(container.querySelector("object")).toBeNull();
  });
  it("labels account inputs and recovers from an unexpected auth failure", async () => {
    runtime.client.auth.signInWithPassword.mockRejectedValue(new Error("offline"));
    render(<ControlAuthPanel initialMode="signin" onSignedIn={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(tr("auth.email")), { target: { value: "owner@example.com" } });
    fireEvent.change(screen.getByLabelText(tr("auth.password")), { target: { value: "password" } });
    fireEvent.click(screen.getByRole("button", { name: tr("auth.signin") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect((screen.getByRole("button", { name: tr("auth.signin") }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("setup availability", () => {
  it("labels navigation and prevents a late available response enabling an unavailable slug", async () => {
    vi.useFakeTimers();
    const old = deferred();
    const current = deferred();
    runtime.client.rpc.mockImplementation((_name: string, args: { want: string }) => args.want === "old-address" ? old.promise : current.promise);
    render(<SetupWizard schemaSql="select 1;" origin="http://localhost" />);
    fireEvent.change(screen.getByLabelText(tr("setup.name")), { target: { value: "Demo" } });
    fireEvent.change(screen.getByLabelText(tr("setup.slug")), { target: { value: "old-address" } });
    await act(async () => { vi.advanceTimersByTime(350); });
    fireEvent.change(screen.getByLabelText(tr("setup.slug")), { target: { value: "new-address" } });
    await act(async () => { vi.advanceTimersByTime(350); current.resolve({ data: false }); });
    await act(async () => { old.resolve({ data: true }); });
    expect(screen.getByText(tr("setup.slugTaken"))).toBeTruthy();
    expect((screen.getByRole("button", { name: tr("common.next") }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("rejected requests and partial deletion", () => {
  it("reports leftover bytes after report-driven deletion without retrying the deleted row", async () => {
    runtime.client.rpc.mockResolvedValue({ data: "member/exhibit.pdf", error: null });
    runtime.storage.remove.mockRejectedValue(new Error("offline"));
    render(<AdminReports reports={[{ ...reports[0], file_id: "file-1" }]} />);
    fireEvent.click(screen.getByRole("button", { name: tr("admin.reports.deleteFile") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("danger.objectsLeft"));
    expect(screen.queryByRole("button", { name: tr("admin.reports.deleteFile") })).toBeNull();
    expect(runtime.router.refresh).toHaveBeenCalledTimes(1);
  });
  it("releases archive erase controls after an unexpected RPC rejection", async () => {
    runtime.client.rpc.mockRejectedValue(new Error("offline"));
    render(<AdminDanger departmentName="Demo" />);
    fireEvent.click(screen.getByRole("button", { name: tr("danger.go") }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Demo" } });
    fireEvent.click(screen.getByRole("button", { name: tr("danger.go") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect((screen.getByRole("button", { name: tr("danger.go") }) as HTMLButtonElement).disabled).toBe(false);
    expect(runtime.router.refresh).not.toHaveBeenCalled();
  });

  it("continues storage batches and reports partial cleanup after a rejected removal", async () => {
    runtime.client.rpc.mockResolvedValue({ data: { files: 101, members: 2, accounts: "deleted", storage_paths: Array.from({ length: 101 }, (_, i) => `${i}.pdf`) }, error: null });
    runtime.storage.remove.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ error: null });
    render(<AdminDanger departmentName="Demo" />);
    fireEvent.click(screen.getByRole("button", { name: tr("danger.go") }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Demo" } });
    fireEvent.click(screen.getByRole("button", { name: tr("danger.go") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("danger.objectsLeft"));
    expect(runtime.storage.remove).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status").textContent).toBe("101 documents 2 documents 1 documents");
    expect(runtime.router.refresh).toHaveBeenCalledTimes(1);
  });

  it("lets an administrator retry a flag change after a rejected request", async () => {
    runtime.client.rpc.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ error: null });
    render(<AdminUsers currentUserId="admin" users={[{ id: "member", username: "Member", is_admin: false, is_banned: false, email: null, file_count: 0, created_at: "2026-01-01" }]} />);
    fireEvent.click(screen.getByRole("button", { name: tr("admin.users.ban") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    fireEvent.click(screen.getByRole("button", { name: tr("admin.users.ban") }));
    await waitFor(() => expect(runtime.router.refresh).toHaveBeenCalledTimes(1));
    expect(runtime.client.rpc).toHaveBeenCalledTimes(2);
  });

  it("preserves a comment draft after rejection and permits a successful retry", async () => {
    runtime.client.from.mockImplementationOnce(() => query(Promise.reject(new Error("offline"))))
      .mockReturnValueOnce(query({ data: { id: "note", file_id: "file-1", author_id: "member", body: "Keep this draft", created_at: "2026-01-01" }, error: null }));
    render(<CommentSection fileId="file-1" currentUserId="member" currentUsername="Member" isAdmin={false} initialComments={[]} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: tr("comments.submit") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Keep this draft");
    fireEvent.click(screen.getByRole("button", { name: tr("comments.submit") }));
    expect(await screen.findByText("Keep this draft", { selector: "p" })).toBeTruthy();
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });

  it.each([false, true])("does not navigate away after failed sign-out (rejection: %s)", async (reject) => {
    if (reject) runtime.client.auth.signOut.mockRejectedValueOnce(new Error("offline"));
    else runtime.client.auth.signOut.mockResolvedValueOnce({ error: { message: "offline" } });
    runtime.client.auth.signOut.mockResolvedValueOnce({ error: null });
    render(<DeptHeader signedIn username="Member" isAdmin={false} />);
    fireEvent.click(screen.getByRole("button", { name: tr("nav.signout") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect(runtime.router.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: tr("nav.signout") }));
    await waitFor(() => expect(runtime.router.push).toHaveBeenCalledWith("/d/demo"));
  });

  it("retries only object cleanup after a file row was deleted", async () => {
    runtime.client.rpc.mockResolvedValue({ data: "member/exhibit.pdf", error: null });
    runtime.storage.remove.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ error: null });
    render(<DeleteFileButton fileId="file-1" isOwner />);
    fireEvent.click(screen.getByRole("button", { name: tr("file.delete") }));
    fireEvent.click(screen.getByRole("button", { name: tr("common.confirm") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("danger.objectsLeft"));
    expect(runtime.router.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: tr("common.retry") }));
    await waitFor(() => expect(runtime.router.push).toHaveBeenCalledWith("/d/demo/vault"));
    expect(runtime.client.rpc).toHaveBeenCalledTimes(1);
    expect(runtime.storage.remove).toHaveBeenCalledTimes(2);
  });

  it("releases file deletion controls when its database request rejects", async () => {
    runtime.client.rpc.mockRejectedValue(new Error("offline"));
    render(<DeleteFileButton fileId="file-1" isOwner />);
    fireEvent.click(screen.getByRole("button", { name: tr("file.delete") }));
    fireEvent.click(screen.getByRole("button", { name: tr("common.confirm") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("common.actionFailed"));
    expect((screen.getByRole("button", { name: tr("common.confirm") }) as HTMLButtonElement).disabled).toBe(false);
    expect(runtime.storage.remove).not.toHaveBeenCalled();
  });

  it.each([false, true])("shows storage leftovers without offering deletion of the same row (rejection: %s)", async (reject) => {
    runtime.client.rpc.mockResolvedValue({ data: "member/exhibit.pdf", error: null });
    if (reject) runtime.storage.remove.mockRejectedValue(new Error("offline"));
    else runtime.storage.remove.mockResolvedValue({ error: { message: "denied" } });
    render(<AdminFiles files={[{ id: "file-1", title: "Exhibit", category: "EXHIBIT", kind: "pdf", size_bytes: 10, score: 0, upvotes: 0, downvotes: 0, report_count: 0, created_at: "2026-01-01", owner_id: "member", case_number: 1, owner_username: "Member", owner_email: null }]} />);
    fireEvent.click(screen.getByRole("button", { name: tr("file.delete") }));
    expect((await screen.findByRole("alert")).textContent).toBe(tr("danger.objectsLeft"));
    expect(screen.queryByRole("button", { name: tr("file.delete") })).toBeNull();
    expect(runtime.router.refresh).toHaveBeenCalledTimes(1);
  });
});
