/**
 * Every department gets its own cookie name and its own cookie path.
 *
 * The name keeps two departments' sessions from overwriting each other even
 * when both happen to sit on the same Supabase project. The path means the
 * browser only sends a department's token to that department's own URLs, so
 * belonging to twenty archives does not put twenty tokens on every request.
 *
 * This is also why the auth callback lives at /d/<slug>/auth/callback rather
 * than at a shared /auth/callback -- the cookie has to be writable from a path
 * the browser will send it back to.
 *
 * Lives in its own module, with no next/headers import, so that both the
 * server client and the browser client can agree on the same value.
 */
export function tenantCookieConfig(slug: string) {
  return { name: `od-${slug}`, path: `/d/${slug}` };
}
