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
  if (!orgs.ok) return NextResponse.json({ available: true, connected: false });

  return NextResponse.json({
    available: true,
    connected: true,
    organizations: orgs.data.map((o) => ({
      id: o.slug ?? o.id,
      name: o.name,
    })),
  });
}
