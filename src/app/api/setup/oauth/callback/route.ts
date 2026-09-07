import { NextResponse, type NextRequest } from "next/server";
import { createControlClient } from "@/lib/control/client";
import {
  COOKIE_BASE,
  STATE_COOKIE,
  TOKEN_COOKIE,
  VERIFIER_COOKIE,
  oauthConfigured,
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
  const back = (why?: string) =>
    NextResponse.redirect(`${origin}/new${why ? `?oauth=${why}` : "?oauth=ok"}`);

  if (!oauthConfigured()) return back("unavailable");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  const verifier = unseal(request.cookies.get(VERIFIER_COOKIE)?.value);

  // The user declined, or Supabase reported a problem.
  if (!code) return back("declined");
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
  if (!exchanged.ok) return back("exchange");

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
