import { NextResponse, type NextRequest } from "next/server";
import { createControlClient, CONTROL_CONFIGURED } from "@/lib/control/client";
import {
  COOKIE_BASE,
  STATE_COOKIE,
  VERIFIER_COOKIE,
  oauthConfigured,
  pkce,
  seal,
} from "@/lib/setup/oauth-session";
import { requestOrigin } from "@/lib/setup/origin";

/**
 * Send somebody to Supabase to authorise the one-click setup.
 *
 * Gated on an OpenDepartment account for the same reason /api/setup/probe is:
 * whatever comes back is going to be attached to a department row that needs
 * an owner, and an unauthenticated endpoint that starts an OAuth dance is an
 * invitation to use this deployment as somebody else's phishing front.
 */
export async function GET(request: NextRequest) {
  if (!CONTROL_CONFIGURED || !oauthConfigured()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 503 });
  }

  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const { verifier, challenge } = pkce();
  // Bound to this account, so a code that comes back for somebody else's
  // session is refused rather than quietly adopted.
  const state = seal(`${user.id}:${crypto.randomUUID()}`);
  const redirectUri = `${requestOrigin(request.headers)}/api/setup/oauth/callback`;

  const authorize = new URL("https://api.supabase.com/v1/oauth/authorize");
  authorize.searchParams.set("client_id", process.env.SUPABASE_OAUTH_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  // No `scope` parameter, deliberately.
  //
  // Supabase marks it deprecated: an OAuth app's scopes are fixed when the app
  // is published in the dashboard, and the authorize endpoint takes them from
  // there. The value this used to send -- `scope=all` -- is not a member of the
  // granular vocabulary Supabase actually uses (`organizations:read`,
  // `projects:write`, ...), so asking for it narrowed the grant to the empty
  // intersection instead of widening it: the code exchanged cleanly and every
  // Management API call the token was then used for came back 403. Omitting the
  // parameter is the documented way to get exactly the scopes the app was
  // published with, which is what README's table asks the operator to set.
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(authorize.toString());
  // Ten minutes is a generous ceiling on "click the green button".
  response.cookies.set(VERIFIER_COOKIE, seal(verifier), { ...COOKIE_BASE, maxAge: 600 });
  response.cookies.set(STATE_COOKIE, state, { ...COOKIE_BASE, maxAge: 600 });
  return response;
}
