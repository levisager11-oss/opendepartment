import { NextResponse, type NextRequest } from "next/server";
import { createControlClient, CONTROL_CONFIGURED } from "@/lib/control/client";
import { safeLocalPath } from "@/lib/navigation";
import { requestOrigin } from "@/lib/setup/origin";

/**
 * E-mail-link landing point for an OpenDepartment account: the confirmation
 * mail after signing up, and the password reset mail.
 *
 * The control-plane twin of /d/<slug>/auth/callback. Without it both links fell
 * through to the project's Site URL with a `?code=` nobody exchanged -- the
 * address got confirmed but nobody was signed in, and a reset link did nothing
 * at all, which for an operator meant no way back into the account that is
 * the only thing able to delist or delete their departments.
 *
 * Public in the proxy (CONTROL_PUBLIC lists /account/auth), because the
 * whole point is that the visitor has no session yet.
 */
export async function GET(request: NextRequest) {
  const base = requestOrigin(request.headers);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // Only somewhere under /account. A confirmation link is not a way to send
  // somebody to an arbitrary page on this site the moment they authenticate.
  const next = safeLocalPath(searchParams.get("next"), "/account", "/account");

  if (!CONTROL_CONFIGURED) return NextResponse.redirect(`${base}/`);
  if (!code || searchParams.get("error_description")) {
    return NextResponse.redirect(`${base}/account/login?error=link`);
  }

  const supabase = await createControlClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // Most often a link opened in a different browser from the one that asked
    // for it: the PKCE verifier lives in the requesting browser's cookies. A
    // confirmation has still gone through by then, so the login page says to
    // simply sign in.
    return NextResponse.redirect(`${base}/account/login?error=link`);
  }

  return NextResponse.redirect(`${base}${next}`);
}
