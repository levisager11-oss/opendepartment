/**
 * Contrast arithmetic for a department's accent colour.
 *
 * The accent is chosen by an administrator and can be anything from a pale
 * gold to a near-black navy, and it is used two ways: as a background with
 * text on it (`btn-accent`, the member's initial in the header) and as the
 * ring, legend and scales of the seal, drawn on the seal's own navy face. A
 * fixed dark ink was right for the default gold and unreadable on the navy an
 * administrator is equally entitled to pick.
 *
 * WCAG 2 relative luminance and contrast ratio; the input has already been
 * through safeAccent(), so it is always `#rrggbb`.
 */

/** The seal's navy, and the dark ink choice for text set on the accent. */
export const MASTHEAD_NAVY = "#0b1c33";

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Whichever of navy or white reads better on top of the accent. */
export function accentInk(accent: string): string {
  return contrastRatio(accent, MASTHEAD_NAVY) >= contrastRatio(accent, "#ffffff")
    ? MASTHEAD_NAVY
    : "#ffffff";
}
