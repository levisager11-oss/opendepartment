import { randomBytes } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createControlClient, CONTROL_CONFIGURED } from "@/lib/control/client";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import {
  COOKIE_BASE,
  TOKEN_COOKIE,
  oauthConfigured,
  unseal,
} from "@/lib/setup/oauth-session";
import {
  anonKey,
  configureAuth,
  createProject,
  listOrganizations,
  projectHealth,
  runSql,
} from "@/lib/setup/supabase-management";
import { requestOrigin } from "@/lib/setup/origin";

/**
 * Create the department owner's Supabase project and put the schema in it.
 *
 * This is the whole manual middle of the wizard -- create a project, wait for
 * it, paste the SQL, turn off e-mail confirmation, allow the callback URL,
 * copy two values back -- done in one request against the token the operator
 * authorised.
 *
 * Three things it deliberately does not do:
 *
 *   - It does not register the department. That still happens from the
 *     browser, under the operator's own control-plane session and
 *     register_department()'s per-account cap, exactly as the manual path
 *     does. This endpoint hands back a URL and an anon key; it does not decide
 *     who they belong to.
 *   - It does not keep the token. The cookie is cleared on the way out, on
 *     success and on failure alike.
 *   - It does not keep the database password. OpenDepartment never connects to
 *     a tenant's database directly -- everything goes through PostgREST with
 *     the anon key -- so holding one would be holding a credential for no
 *     reason. The owner resets it from their own dashboard if they need it.
 */
const LIMIT = 4;
const WINDOW_MS = 10 * 60_000;

/** How long to wait for a new project to come up before handing back. */
const READY_TIMEOUT_MS = 150_000;
const POLL_MS = 5_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: NextRequest) {
  if (!CONTROL_CONFIGURED || !oauthConfigured()) {
    return NextResponse.json({ error: "NOT_AVAILABLE" }, { status: 503 });
  }

  const {
    data: { user },
  } = await (await createControlClient()).auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "NOT_SIGNED_IN" }, { status: 401 });
  }

  // Creating Supabase projects is the most expensive thing this app can be
  // made to do on somebody else's account, so the ceiling here is much lower
  // than the probe's.
  const byAccount = rateLimit(`provision:${user.id}`, LIMIT, WINDOW_MS);
  const byAddress = rateLimit(`provision-ip:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!byAccount.ok || !byAddress.ok) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const token = unseal(request.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) {
    return NextResponse.json({ error: "NOT_CONNECTED" }, { status: 401 });
  }

  let body: {
    name?: string;
    slug?: string;
    org?: string;
    region?: string;
    sql?: string;
    /** Set when resuming a project that was created but was not up yet. */
    ref?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 60) || "OpenDepartment";
  const slug = (body.slug ?? "").trim().toLowerCase();
  const sql = body.sql ?? "";

  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(slug)) {
    return NextResponse.json({ error: "BAD_SLUG" }, { status: 400 });
  }
  // The schema is ~50 KB and the wizard appends a short personalisation block.
  // A body far outside that is not something to hand to a database.
  if (sql.length < 1000 || sql.length > 400_000) {
    return NextResponse.json({ error: "BAD_SQL" }, { status: 400 });
  }

  /**
   * Resuming.
   *
   * A project can take longer to come up than any request should wait, and the
   * one thing that must never happen when somebody retries is a SECOND project
   * on their account. So a retry carries the ref of the project this endpoint
   * already made, and picks up from the wait.
   */
  let ref = (body.ref ?? "").trim();
  if (ref) {
    if (!/^[a-z0-9]{12,32}$/.test(ref)) {
      return finish(NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 }));
    }
  } else {
    const orgs = await listOrganizations(token);
    if (!orgs.ok || orgs.data.length === 0) {
      return finish(NextResponse.json({ error: "NO_ORGANISATION" }, { status: 400 }));
    }
    const org =
      orgs.data.find((o) => (o.slug ?? o.id) === body.org) ?? orgs.data[0];

    // Generated, used once and discarded -- see the note above.
    const created = await createProject(token, {
      name,
      org,
      region: body.region || "us-east-1",
      dbPass: randomBytes(24).toString("base64url"),
    });
    if (!created.ok) {
      return finish(
        NextResponse.json(
          { error: "CREATE_FAILED", detail: created.message },
          { status: 502 }
        )
      );
    }
    ref = created.data.id;
  }

  const projectUrl = `https://${ref}.supabase.co`;

  // A brand new project is not immediately able to answer, and running the
  // schema against one that is still coming up fails in ways that look like a
  // broken schema rather than a slow provisioner.
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let ready = false;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const health = await projectHealth(token, ref);
    if (
      health.ok &&
      Array.isArray(health.data) &&
      health.data.length > 0 &&
      health.data.every((s) => s.status === "ACTIVE_HEALTHY")
    ) {
      ready = true;
      break;
    }
  }

  if (!ready) {
    // The project exists and will come up on its own. The token is KEPT here,
    // alone among the exits: this is the one outcome the caller can carry on
    // from, by sending the ref back once the project is up. Saying nothing
    // happened would be worse than useless -- they would create a second one.
    return NextResponse.json(
      { error: "STILL_STARTING", ref, url: projectUrl, resumable: true },
      { status: 202 }
    );
  }

  const applied = await runSql(token, ref, sql);
  if (!applied.ok) {
    return finish(
      NextResponse.json(
        { error: "SCHEMA_FAILED", detail: applied.message, ref, url: projectUrl },
        { status: 502 }
      )
    );
  }

  const key = await anonKey(token, ref);
  if (!key) {
    return finish(
      NextResponse.json(
        { error: "NO_KEY", ref, url: projectUrl },
        { status: 502 }
      )
    );
  }

  // The e-mail step, done rather than explained. Not fatal if it fails: the
  // department is otherwise ready, and the wizard shows the manual version.
  const origin = requestOrigin(request.headers);
  const auth = await configureAuth(token, ref, {
    siteUrl: `${origin}/d/${slug}`,
    callbackUrl: `${origin}/d/${slug}/auth/callback`,
  });

  return finish(
    NextResponse.json({
      ok: true,
      ref,
      url: projectUrl,
      key,
      authConfigured: auth.ok,
    })
  );
}

/**
 * Clear the token on the way out.
 *
 * A token that outlives the request that needed it is a token sitting in
 * somebody's browser for no reason. Applied to every exit above except
 * STILL_STARTING, which is the only one the caller can continue from.
 */
function finish(response: NextResponse): NextResponse {
  response.cookies.set(TOKEN_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
  return response;
}
