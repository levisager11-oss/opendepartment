/**
 * Where the exhibit page's "back to the vault" link should land.
 *
 * The vault keeps its filters in the URL, so they survive a reload and can be
 * shared -- but the exhibit page renders its back link on the server, where
 * the query string of whichever vault this tab came from is unknown. The vault
 * records it per department in sessionStorage (per tab, gone when the tab
 * closes) and the link reads it back after hydration.
 */
export function lastVaultKey(slug: string): string {
  return `od.vault.last:${slug}`;
}

/**
 * A stored search string, only if it is one -- a value planted by something
 * else under this key must not be able to turn the link into anything but
 * the vault with a query string.
 */
export function vaultReturnHref(base: string, stored: string | null): string {
  if (!stored || !stored.startsWith("?") || /[#\\\s]/.test(stored)) return base;
  return `${base}${stored}`;
}
