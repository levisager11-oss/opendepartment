/**
 * Light or dark, and who decided.
 *
 * No cookie means "follow the system": the stylesheet answers that on its own
 * with prefers-color-scheme, so nothing has to run before the first paint and
 * nothing flashes. A cookie means the reader chose, and the root layout writes
 * the choice onto <html data-theme> on the server -- also before the first
 * paint. Either way the page arrives in the right colours.
 *
 * Lives in its own module, with no next/headers import, so the layout (server)
 * and the switcher (browser) agree on one name and one set of values.
 */
export const THEME_COOKIE = "od_theme";

export type Theme = "light" | "dark";
export type ThemeChoice = Theme | "system";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/** The attribute value for <html>, or undefined to follow the system. */
export function themeAttribute(cookieValue: string | undefined): Theme | undefined {
  return isTheme(cookieValue) ? cookieValue : undefined;
}
