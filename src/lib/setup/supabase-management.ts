/**
 * The parts of the Supabase Management API the one-click setup needs.
 *
 * Every call is defensive on purpose. This code runs against somebody's real
 * Supabase account, at the one moment they are most likely to give up, and the
 * useful failure is always "here is what went wrong, and here is the manual
 * step that does the same thing" -- never a stack trace or a silent hang.
 *
 * Shapes are taken from the Management API reference. Where a field name has
 * changed across versions (organizations answer to both `slug` and `id`
 * depending on vintage), both are accepted rather than guessed at.
 */
const API = "https://api.supabase.com";

export type Org = { id?: string; slug?: string; name: string };

async function call<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, message: "Could not reach Supabase." };
  }

  const text = await response.text();
  if (!response.ok) {
    // Supabase returns {message} on most errors; fall back to the raw body,
    // trimmed, because an HTML error page is not something to put on screen.
    let message = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* keep the trimmed body */
    }
    return { ok: false, status: response.status, message };
  }

  try {
    return { ok: true, data: (text ? JSON.parse(text) : null) as T };
  } catch {
    return { ok: false, status: response.status, message: "Unreadable reply." };
  }
}

export async function exchangeCode(opts: {
  code: string;
  redirectUri: string;
  verifier: string;
}): Promise<{ ok: true; token: string } | { ok: false; message: string }> {
  const id = process.env.SUPABASE_OAUTH_CLIENT_ID ?? "";
  const secret = process.env.SUPABASE_OAUTH_CLIENT_SECRET ?? "";

  let response: Response;
  try {
    response = await fetch(`${API}/v1/oauth/token`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        accept: "application/json",
        // Per the OAuth2 spec and the Supabase integration guide, the client
        // authenticates with basic auth rather than by putting its secret in
        // the body.
        authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: opts.code,
        redirect_uri: opts.redirectUri,
        code_verifier: opts.verifier,
      }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, message: "Could not reach Supabase." };
  }

  if (!response.ok) {
    // The body carries the OAuth error code (invalid_grant, invalid_client,
    // redirect_uri_mismatch...), which is the whole diagnosis. Throwing it
    // away and reporting a status number was how this failure became
    // unreadable from the outside.
    let detail = "";
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      detail = body.error ?? body.message ?? "";
    } catch {
      /* not JSON; the status is all there is */
    }
    return {
      ok: false,
      message: `${response.status}${detail ? ` ${detail}` : ""}`,
    };
  }

  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token) return { ok: false, message: "No access token." };
  return { ok: true, token: body.access_token };
}

export function listOrganizations(token: string) {
  return call<Org[]>(token, "/v1/organizations");
}

/**
 * Create a project.
 *
 * `organization_slug` is what the current reference documents;
 * older deployments answer to `organization_id`. Both are sent -- the API
 * ignores what it does not know, and sending one field the server has renamed
 * is the difference between this working and this failing for everybody on the
 * wrong side of the rename.
 *
 * The database password is generated here and deliberately thrown away.
 * OpenDepartment never connects to the database directly -- everything goes
 * through PostgREST with the anon key -- so keeping it would be keeping a
 * credential for no reason. The owner resets it from their own dashboard if
 * they ever need it, which is a documented one-click operation.
 */
export function createProject(
  token: string,
  opts: { name: string; org: Org; region: string; dbPass: string }
) {
  return call<{ id: string; name: string; status?: string }>(
    token,
    "/v1/projects",
    {
      method: "POST",
      body: JSON.stringify({
        name: opts.name,
        organization_slug: opts.org.slug ?? opts.org.id,
        organization_id: opts.org.id ?? opts.org.slug,
        db_pass: opts.dbPass,
        region: opts.region,
        region_selection: { type: "smartGroup", code: opts.region },
        desired_instance_size: "micro",
      }),
    }
  );
}

export function projectHealth(token: string, ref: string) {
  return call<Array<{ name?: string; status?: string }>>(
    token,
    `/v1/projects/${ref}/health?services=db,rest,auth`
  );
}

export function runSql(token: string, ref: string, query: string) {
  return call<unknown>(token, `/v1/projects/${ref}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

type ApiKey = { name?: string; api_key?: string; id?: string; type?: string };

/**
 * The publishable key, by whichever name this project's vintage uses.
 *
 * `reveal=true` is needed for the newer key format; the legacy JWT keys come
 * back without it. Asking for the reveal and falling back covers both.
 */
export async function anonKey(
  token: string,
  ref: string
): Promise<string | null> {
  for (const path of [
    `/v1/projects/${ref}/api-keys?reveal=true`,
    `/v1/projects/${ref}/api-keys`,
  ]) {
    const result = await call<ApiKey[]>(token, path);
    if (!result.ok || !Array.isArray(result.data)) continue;

    const wanted = result.data.find(
      (k) => k.name === "anon" || k.name === "publishable" || k.type === "publishable"
    );
    if (wanted?.api_key) return wanted.api_key;
  }
  return null;
}

/**
 * Turn off e-mail confirmation and allow the department's callback URL.
 *
 * This is the step the manual wizard has to spend a whole screen asking people
 * to do by hand, because a new Supabase project will not deliver mail to
 * anybody outside its own team and rate-limits to a handful an hour -- so with
 * confirmation on and no SMTP, no invited member ever gets in and nothing says
 * why. Here it is two fields.
 *
 * Failure is not fatal: the caller reports it and shows the manual
 * instructions, which is strictly better than refusing to finish a department
 * that is otherwise ready.
 */
export function configureAuth(
  token: string,
  ref: string,
  opts: { siteUrl: string; callbackUrl: string }
) {
  return call<unknown>(token, `/v1/projects/${ref}/config/auth`, {
    method: "PATCH",
    body: JSON.stringify({
      site_url: opts.siteUrl,
      uri_allow_list: opts.callbackUrl,
      mailer_autoconfirm: true,
    }),
  });
}
