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
  // Deployment proxies must sanitize these headers. Validate their grammar
  // here so a malformed forwarded value cannot become a redirect URL.
  const validHost = (value: string | null) => value && /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(value) ? value : null;
  const host = validHost(headers.get("x-forwarded-host")) ?? validHost(headers.get("host")) ?? "localhost:3000";
  const forwarded = headers.get("x-forwarded-proto");
  const proto = forwarded === "http" || forwarded === "https" ? forwarded :
    /^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https";
  return `${proto}://${host}`;
}
