import { NextResponse, type NextRequest } from "next/server";
import { createControlClient, CONTROL_CONFIGURED } from "@/lib/control/client";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  COOKIE_BASE,
  TOKEN_COOKIE,
  oauthConfigured,
  unseal,
} from "@/lib/setup/oauth-session";
import { deleteProject, getProject } from "@/lib/setup/supabase-management";

/**
 * Delete the Supabase project behind one of the caller's departments.
 *
 * The mirror image of /api/setup/provision, and it exists for the same reason:
 * a department could be created in four clicks and only ever taken apart by
 * hand. Somebody who is finished with an archive should not have to be talked
 * through a dashboard to make the data actually stop existing -- and the step
 * people skip is exactly the one that matters, because everything private a
 * department ever held is in that project and nowhere else.
 *
 * What it deliberately does NOT do, and why:
 *
 *   - **It does not take a project ref from the browser.** The ref is read out
 *     of the department row, which RLS has already established belongs to this
 *     operator. A Management API token is authorised for a whole organisation,
 *     so an endpoint that deleted whatever ref it was handed would be a way to
 *     spend somebody's own authorisation on a project they never named.
 *   - **It does not delist the department.** That stays in the browser under
 *     the operator's own control-plane session, exactly as registering does --
 *     and it must, because DELETE on a suspended row is refused by policy and
 *     an endpoint that did it here would be a way around the suspension.
 *   - **It does not keep the token.** Cleared on every exit, success and
 *     failure alike. That means deleting a second department needs a second
 *     authorisation, which is the right trade for a credential that can delete
 *     every project in an organisation.
 *
 * When it cannot do the job it says so with the project ref and a dashboard
 * address, because "your data is still there and here is where" is the only
 * useful thing to say at that point. The caller shows it; nothing is silently
 * assumed to have worked.
 */
const LIMIT = 6;
const WINDOW_MS = 10 * 60_000;

/** The same closed set the control plane's CHECK constraint allows. */
const PROJECT_URL = /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)$/;

export async function POST(request: NextRequest) {
  if (!CONTROL_CONFIGURED || !oauthConfigured()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 503 });
  }

  const control = await createControlClient();
  const {
    data: { user },
  } = await control.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  const byAccount = rateLimit(`deprovision:${user.id}`, LIMIT, WINDOW_MS);
  const byAddress = rateLimit(
    `deprovision-ip:${clientKey(request)}`,
    LIMIT,
    WINDOW_MS
  );
  if (!byAccount.ok || !byAddress.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(slug)) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  // departments_read_own is what makes this an authorisation check and not
  // just a lookup: a slug belonging to somebody else reads as absent.
  const { data: department } = await control
    .from("departments")
    .select("slug, supabase_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!department) {
    return NextResponse.json({ error: "NO_SUCH_DEPARTMENT" }, { status: 404 });
  }

  const ref = PROJECT_URL.exec(department.supabase_url as string)?.[1];
  if (!ref) {
    // The column's CHECK constraint should make this unreachable. If it ever
    // is reached, the honest answer is "we cannot find the project from here",
    // not a request to the Management API built out of a URL we do not
    // recognise.
    return NextResponse.json({ error: "NOT_SUPABASE" }, { status: 409 });
  }

  const dashboard = `https://supabase.com/dashboard/project/${ref}`;

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    // Recoverable, and the only exit the caller should offer a retry for:
    // connect, then press the button again.
    return NextResponse.json(
      { error: "NOT_CONNECTED", ref, dashboard },
      { status: 401 }
    );
  }

  // Ask before deleting. A 404 here is the ordinary case of a project somebody
  // already removed from their dashboard, and reporting that as a failure
  // sends them back there to look for something that is not there.
  const existing = await getProject(token, ref);
  if (!existing.ok && existing.status === 404) {
    return finish(
      NextResponse.json({ ok: true, ref, deleted: false, alreadyGone: true, dashboard })
    );
  }
  if (!existing.ok && existing.status === 401) {
    return finish(
      NextResponse.json(
        { error: "AUTH_EXPIRED", detail: refusal("project", existing), ref, dashboard },
        { status: 401 }
      )
    );
  }
  if (!existing.ok && existing.status === 403) {
    // A token that is valid and not allowed to touch this project: an OAuth
    // app without Projects:Write, or a project in an organisation this
    // authorisation does not cover. Neither is fixable from here.
    return finish(
      NextResponse.json(
        { error: "API_REFUSED", detail: refusal("project", existing), ref, dashboard },
        { status: 502 }
      )
    );
  }

  const removed = await deleteProject(token, ref);
  if (!removed.ok && removed.status === 404) {
    return finish(
      NextResponse.json({ ok: true, ref, deleted: false, alreadyGone: true, dashboard })
    );
  }
  if (!removed.ok) {
    return finish(
      NextResponse.json(
        {
          error: removed.status === 401 ? "AUTH_EXPIRED" : "DELETE_FAILED",
          detail: refusal("delete", removed),
          ref,
          dashboard,
        },
        { status: removed.status === 401 ? 401 : 502 }
      )
    );
  }

  return finish(NextResponse.json({ ok: true, ref, deleted: true, dashboard }));
}

/** The operation, the status and Supabase's own words -- never a guess. */
function refusal(
  op: string,
  result: { status: number; message: string }
): string {
  return `${op}: ${result.status} ${result.message}`.slice(0, 300);
}

/**
 * Clear the token on the way out.
 *
 * Every exit, unlike provision -- there is no outcome here a caller continues
 * from with the same token. NOT_CONNECTED returns before this, because there
 * is nothing to clear and the caller is about to be sent to authorise again.
 */
function finish(response: NextResponse): NextResponse {
  response.cookies.set(TOKEN_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
  return response;
}
