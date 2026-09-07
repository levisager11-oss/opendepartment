/**
 * The address the browser actually used.
 *
 * Behind Vercel's proxy the request URL carries an internal host, so a
 * redirect_uri built from it would be one Supabase rejects and one the browser
 * could not follow. Deriving it per request also means preview deployments
 * work without their own configuration -- the same reasoning as the auth
 * callback inside a department.
 */
export function requestOrigin(headers: Headers): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto =
    headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
