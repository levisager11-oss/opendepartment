import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Where a Supabase access token lives during automatic setup, and why it is
 * not anywhere else.
 *
 * The one-click path needs a Management API token: creating a project, running
 * the schema and configuring auth are all things only a token can do. That is
 * a real privilege over the person's Supabase account, so the question is not
 * whether OpenDepartment ever touches one -- it does -- but where it rests and
 * for how long.
 *
 * It rests in the operator's OWN BROWSER, in an httpOnly cookie, encrypted
 * with a key derived from the OAuth client secret, scoped to /api/setup, and
 * expiring in an hour. Consequences worth being explicit about:
 *
 *   - There is no table of Supabase tokens to breach. A compromise of the
 *     control-plane database yields nothing, because nothing is in it.
 *   - The token is not readable by any script on the page, ours or anybody
 *     else's, because httpOnly.
 *   - It cannot be replayed by whoever holds the cookie alone: the encryption
 *     key never leaves the server.
 *   - It is deleted the moment provisioning finishes, and expires by itself if
 *     somebody abandons the wizard halfway.
 *
 * What this does NOT claim: that OpenDepartment cannot see the token. It
 * decrypts it on every provisioning request, which it must in order to use it.
 * The claim is narrower and checkable -- it is never stored server-side, and
 * its life is measured in minutes.
 *
 * AES-256-GCM, so a tampered cookie fails to decrypt rather than decrypting
 * into something attacker-chosen.
 */
export const TOKEN_COOKIE = "od-supabase-token";
export const VERIFIER_COOKIE = "od-supabase-verifier";
export const STATE_COOKIE = "od-supabase-state";

/** Everything below is inert unless the deployment registered an OAuth app. */
export function oauthConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_OAUTH_CLIENT_ID &&
      process.env.SUPABASE_OAUTH_CLIENT_SECRET
  );
}

/**
 * The encryption key is derived from the client secret rather than being a
 * separate variable to forget to set. Hashed rather than used raw so that a
 * secret of any length yields the 32 bytes AES-256 wants.
 */
function key(): Buffer {
  const secret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
  if (!secret) throw new Error("SUPABASE_OAUTH_CLIENT_SECRET is not set");
  return createHash("sha256").update(`od:setup:v1:${secret}`).digest();
}

export function seal(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}

export function unseal(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const [iv, tag, body] = value.split(".");
    if (!iv || !tag || !body) return null;

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(body, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Tampered, or sealed under a client secret that has since been rotated.
    // Either way there is no token here and the caller starts over.
    return null;
  }
}

/** PKCE, so an intercepted authorization code is not on its own enough. */
export function pkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/setup",
};
