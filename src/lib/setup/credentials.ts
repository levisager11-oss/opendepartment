/**
 * Reading a Supabase project's coordinates out of whatever somebody pasted.
 *
 * The connect step used to be two narrow fields that had to be filled from two
 * different corners of the Supabase dashboard, in the right order, without
 * catching a stray newline. It is the step people get wrong, and getting it
 * wrong means going back to a dashboard in another tab to find out which half
 * was mistyped.
 *
 * Nothing here authorises anything. Both values are public by design -- they
 * are handed to every visitor of /d/<slug> -- and the server still probes the
 * project, still refuses a secret key, and still requires an account before it
 * will do either. This module only saves typing.
 */

/** The same closed set the probe pins to and the control plane's CHECK allows. */
const SUPABASE_URL_RE = /https:\/\/([a-z0-9-]+)\.supabase\.(co|in)\b/i;

/**
 * A JWT, or one of the current opaque keys.
 *
 * The JWT branch is deliberately loose about the signature segment: it is
 * never verified here, and a key that does not work fails at the probe with a
 * better message than a regex could give.
 */
const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/;
const OPAQUE_KEY_RE = /\bsb_(publishable|secret)_[A-Za-z0-9_-]{8,}/;

/** Decode a JWT payload, or null for anything that is not one. */
function jwtPayload(key: string): Record<string, unknown> | null {
  const segment = key.split(".")[1];
  if (!segment) return null;

  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * The project reference a legacy Supabase key carries in its own payload.
 *
 * This is what turns two fields into one: an anon JWT already says which
 * project it belongs to (`{"iss":"supabase","ref":"abcdefghijkl",...}`), so
 * pasting the key is enough and the URL can be filled in for you.
 *
 * The current `sb_publishable_` keys are opaque and carry no reference, so
 * those still need the URL. The field stays on the form for exactly that
 * reason -- and because a project on `.supabase.in` cannot be reconstructed
 * from a reference alone.
 */
export function projectRefFromKey(key: string): string | null {
  const payload = jwtPayload(key.trim());
  const ref = payload?.ref;
  return typeof ref === "string" && /^[a-z0-9-]+$/i.test(ref) ? ref : null;
}

/** Same rule as /api/setup/probe, applied early so the answer is immediate. */
export function looksLikeSecretKey(key: string): boolean {
  const clean = key.trim();
  if (clean.startsWith("sb_secret_")) return true;
  return jwtPayload(clean)?.role === "service_role";
}

export type ParsedCredentials = {
  url: string | null;
  key: string | null;
  /** True when the URL was reconstructed from the key rather than pasted. */
  derivedUrl: boolean;
};

/**
 * Pull a project URL and a key out of arbitrary pasted text.
 *
 * Written against what people actually have on their clipboard at this point
 * in the setup: the two values on their own, a `.env` block from Supabase's
 * own quickstart panel, a JSON snippet, or the whole "Project API keys" card
 * with its headings still attached. All of those reduce to "there is a
 * Supabase URL somewhere in here and a key somewhere in here".
 */
export function parseSupabaseCredentials(text: string): ParsedCredentials {
  const urlMatch = text.match(SUPABASE_URL_RE);
  const keyMatch = text.match(JWT_RE) ?? text.match(OPAQUE_KEY_RE);

  const key = keyMatch?.[0] ?? null;
  let url = urlMatch ? urlMatch[0].replace(/\/+$/, "") : null;
  let derivedUrl = false;

  if (!url && key) {
    const ref = projectRefFromKey(key);
    if (ref) {
      url = `https://${ref}.supabase.co`;
      derivedUrl = true;
    }
  }

  return { url, key, derivedUrl };
}
