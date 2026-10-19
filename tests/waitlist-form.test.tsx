// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WaitlistForm } from "@/components/WaitlistForm";
import { translate, type TranslationKey } from "@/lib/i18n/dictionary";

const runtime = vi.hoisted(() => ({ rpc: vi.fn(), ready: true }));
vi.mock("@/lib/control/browser", () => ({
  get CONTROL_READY() { return runtime.ready; },
  createControlBrowserClient: () => ({ rpc: runtime.rpc }),
}));
vi.mock("@/lib/i18n/provider", () => ({ useI18n: () => ({ t: (key: TranslationKey) => translate("en", key) }) }));
afterEach(() => { cleanup(); vi.resetAllMocks(); runtime.ready = true; });

function submit() {
  render(<WaitlistForm />);
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "Person@Example.test" } });
  fireEvent.change(screen.getByLabelText("Group size"), { target: { value: "12" } });
  fireEvent.change(screen.getByLabelText("Expected storage"), { target: { value: "10_100gb" } });
  fireEvent.click(screen.getByLabelText("5 EUR"));
  fireEvent.submit(screen.getByRole("button", { name: "Join the waitlist" }).closest("form")!);
}

it("submits the RPC arguments and shows the quiet success message", async () => {
  let resolve!: (value: { error: null }) => void;
  runtime.rpc.mockReturnValue(new Promise((done) => { resolve = done; }));
  submit();
  expect(runtime.rpc).toHaveBeenCalledWith("join_waitlist", {
    email: "person@example.test", group_size: 12, expected_storage: "10_100gb", willingness_to_pay: 5,
  });
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
  resolve({ error: null });
  expect((await screen.findByRole("status")).textContent).toBe(translate("en", "waitlist.success"));
});

it.each(["INVALID_EMAIL", "INVALID_GROUP_SIZE", "INVALID_STORAGE", "INVALID_PRICE", "RATE_LIMITED", "WAITLIST_FULL"] as const)("explains %s", async (message) => {
  runtime.rpc.mockResolvedValue({ error: { message } });
  submit();
  expect((await screen.findByRole("alert")).textContent).toBe(translate("en", `waitlist.${message}`));
});

it("handles an unexpected failure", async () => {
  runtime.rpc.mockRejectedValue(new Error("offline"));
  submit();
  expect((await screen.findByRole("alert")).textContent).toBe(translate("en", "common.error"));
});

it("renders nothing without a control plane", () => {
  runtime.ready = false;
  expect(render(<WaitlistForm />).container.innerHTML).toBe("");
  expect(runtime.rpc).not.toHaveBeenCalled();
});
