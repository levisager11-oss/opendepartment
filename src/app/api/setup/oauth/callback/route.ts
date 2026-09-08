import { NextResponse, type NextRequest } from "next/server";
import { createControlClient } from "@/lib/control/client";
import {
  COOKIE_BASE,
  RETURN_COOKIE,
  STATE_COOKIE,
  TOKEN_COOKIE,
  VERIFIER_COOKIE,
  oauthConfigured,
  safeReturn,
  seal,
  unseal,
} from "@/lib/setup/oauth-session";
import { exchangeCode } from "@/lib/setup/supabase-management";
import { requestOrigin } from "@/lib/setup/origin";

/**
 * Where Supabase sends somebody back after they authorise.
 *
 * Everything that can go wrong here sends them back to the wizard with a
 * reason in the query string rather than rendering an error page: they have a
 * half-filled form in that tab's sessionStorage and it is still good.
 */
export async function GET(request: NextRequest) {
  const origin = requestOrigin(request.headers);
  // Which screen started this: the setup wizard, or the account screen about to
  // delete a department's project. Re-checked through safeReturn even though
  // /oauth/start already wrote it -- the cookie is scoped to /api/setup rather
  // than signed, and a redirect target is not something to take on trust from
  // one.
  const destination = safeReturn(request.cookies.get(RETURN_COOKIE)?.value);

  /**
   * Back to whichever screen started this, saying why.
   *
   * `detail` is Supabase's own words about a refusal -- never a code, a secret
   * or a token, all of which stay in this function. It is carried in the query
   * string because the caller's state lives in that tab and this route cannot
   * render into it; the caller reads it once and strips it from the address bar.
   */
  const back = (why?: string, detail?: string) => {
    const query = new URLSearchParams({ oauth: why ?? "ok" });
    if (detail) query.set("detail", detail.slice(0, 300));
    const response = NextResponse.redirect(`${origin}${destination}?${query}`);
    response.cookies.set(RETURN_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
    return response;
  };

  if (!oauthConfigured()) return back("unavailable");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const verifier = unseal(request.cookies.get(VERIFIER_COOKIE)?.value);

  // The user declined, or Supabase reported a problem. When it is the latter
  // the reason is in the query string, and it is worth repeating.
  if (!code) {
    const reported =
      request.nextUrl.searchParams.get("error_description") ??
      request.nextUrl.searchParams.get("error") ??
      undefined;
    return back("declined", reported);
  }
  if (!state || !expectedState || state !== expectedState) return back("state");
  if (!verifier) return back("expired");

  // The state seals the account id it was issued to. A code arriving in a
  // different session is not this person's to redeem.
  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  const sealedFor = unseal(state)?.split(":")[0];
  if (!user || !sealedFor || sealedFor !== user.id) return back("session");

  const exchanged = await exchangeCode({
    code,
    redirectUri: `${origin}/api/setup/oauth/callback`,
    verifier,
  });
  if (!exchanged.ok) return back("exchange", exchanged.message);

  const response = back();
  // An hour is longer than provisioning takes and shorter than anybody leaves
  // a tab open on purpose. Cleared explicitly when setup finishes.
  response.cookies.set(TOKEN_COOKIE, seal(exchanged.token), {
    ...COOKIE_BASE,
    maxAge: 3600,
  });
  response.cookies.set(VERIFIER_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
  response.cookies.set(STATE_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
  return response;
}
