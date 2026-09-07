import { NextResponse, type NextRequest } from "next/server";
import { createControlClient } from "@/lib/control/client";
import { TOKEN_COOKIE, oauthConfigured, unseal } from "@/lib/setup/oauth-session";
import { listOrganizations } from "@/lib/setup/supabase-management";

/**
 * Whether this deployment offers one-click setup, and whether this browser is
 * currently holding a token for it.
 *
 * The wizard cannot answer either question itself: the client id is not public
 * and the token cookie is httpOnly, which is the point of both.
 */
export async function GET(request: NextRequest) {
  if (!oauthConfigured()) {
    return NextResponse.json({ available: false, connected: false });
  }

  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  if (!user) return NextResponse.json({ available: true, connected: false });

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) return NextResponse.json({ available: true, connected: false });

  // A token that no longer works is not a connection. Listing organisations is
  // the cheapest call that proves it, and the wizard needs them anyway.
  const orgs = await listOrganizations(token);
  if (!orgs.ok) {
    // This is the branch that used to make the whole feature look like it did
    // nothing: the round trip succeeds, a token is sealed into the cookie, and
    // then the very first call with it is refused -- so the wizard asked "am I
    // connected?", heard "no", and redrew the same Connect button with no hint
    // that anything had happened at all. A refusal is now reported as one.
    // 401/403 means the token is real but not allowed to do this, which is what
    // an OAuth app published without Organizations:Read looks like from here.
    const refused = orgs.status === 401 || orgs.status === 403;
    return NextResponse.json({
      available: true,
      connected: false,
      reason: refused ? "api_refused" : "api_unreachable",
      detail: orgs.message.slice(0, 300),
    });
  }

  return NextResponse.json({
    available: true,
    connected: true,
    organizations: orgs.data.map((o) => ({
      id: o.slug ?? o.id,
      name: o.name,
    })),
  });
}
