// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { translate, type TranslationKey } from "@/lib/i18n/dictionary";
import { THEME_COOKIE, themeAttribute } from "@/lib/theme";
import { ThemeToggle } from "@/components/ThemeToggle";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/i18n/provider", () => ({
  useI18n: () => ({ t: (key: TranslationKey) => translate("en", key) }),
}));

const tr = (key: TranslationKey) => translate("en", key);
const pressed = (key: TranslationKey) =>
  screen.getByRole("button", { name: tr(key) }).getAttribute("aria-pressed");

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
  router.refresh.mockClear();
});
afterEach(cleanup);

it("trusts only the two themes it knows from the cookie", () => {
  expect(themeAttribute("dark")).toBe("dark");
  expect(themeAttribute("light")).toBe("light");
  // Anything else -- a tampered cookie included -- follows the system rather
  // than landing in the markup.
  for (const value of [undefined, "", "system", "DARK", "dark;x", "\" onload=\""]) {
    expect(themeAttribute(value)).toBeUndefined();
  }
});

it("applies a choice at once, remembers it, and forgets it again for the system", () => {
  render(<ThemeToggle />);
  expect(pressed("theme.system")).toBe("true");

  fireEvent.click(screen.getByRole("button", { name: tr("theme.dark") }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.cookie).toContain(`${THEME_COOKIE}=dark`);
  expect(pressed("theme.dark")).toBe("true");
  expect(router.refresh).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: tr("theme.system") }));
  expect(document.documentElement.dataset.theme).toBeUndefined();
  expect(document.cookie).not.toContain(THEME_COOKIE);
  expect(pressed("theme.system")).toBe("true");
});

it("shows the choice the server rendered", () => {
  document.documentElement.dataset.theme = "light";
  render(<ThemeToggle />);
  expect(pressed("theme.light")).toBe("true");
  expect(pressed("theme.system")).toBe("false");
});

it("keeps both copies of the dark tokens identical, and both off paper", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const block = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    expect(start, selector).toBeGreaterThan(-1);
    const body = css.slice(start + selector.length + 2, css.indexOf("}", start));
    return body.split(";").map((d) => d.trim()).filter(Boolean);
  };
  const byAttribute = block(':root[data-theme="dark"]');
  const bySystem = block(':root:not([data-theme="light"])');
  // Written twice because plain CSS cannot share a block between an attribute
  // selector and a media query; a token changed in one copy only would give a
  // different dark theme depending on how it was chosen.
  expect(byAttribute).toEqual(bySystem);
  expect(byAttribute).toContain("color-scheme: dark");
  // Printing is always on white.
  expect(css).toContain('@media screen {\n  :root[data-theme="dark"]');
  expect(css).toContain('@media screen and (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"])');
});
