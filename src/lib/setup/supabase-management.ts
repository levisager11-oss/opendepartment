/**
 * The parts of the Supabase Management API the one-click setup needs.
 *
 * Every call is defensive on purpose. This code runs against somebody's real
 * Supabase account, at the one moment they are most likely to give up, and the
 * useful failure is always "here is what went wrong, and here is the manual
 * step that does the same thing" -- never a stack trace or a silent hang.
 *
 * Shapes are checked against the live OpenAPI description at
 * https://api.supabase.com/api/v1-json rather than remembered. Two habits that
 * are safe when READING a reply are not safe when writing a request:
 *
 *   - Reading a field under both its old and new name is fine, because the
 *     server sends whichever it still sends (organizations answer to both
 *     `slug` and `id`, projects to both `ref` and `id`).
 *   - SENDING both names is not. Request bodies here are
 *     `additionalProperties: false`, and some pairs are explicitly exclusive,
 *     so hedging turns a working call into a rejected one. Requests below send
 *     the current name only.
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

  // The body carries why, and knowing why is the difference between "try
  // again" and "your redirect URL does not match the one you registered".
  // OAuth2 spells it {error, error_description}; Supabase's own errors are
  // {message}. Neither ever contains the code, the secret or a token, so this
  // is safe to hand back to the browser.
  const text = await response.text();
  if (!response.ok) {
    // The body carries the OAuth error code (invalid_grant, invalid_client,
    // redirect_uri_mismatch...), which is the whole diagnosis: those are
    // different problems wearing the same HTTP status, so reducing them to a
    // number is how this failure became unreadable from the outside.
    // `error_description` first, because it is the one written for a person.
    let detail = text.slice(0, 300);
    try {
      const parsed = JSON.parse(text) as {
        error_description?: string;
        error?: string;
        message?: string;
      };
      detail = parsed.error_description ?? parsed.error ?? parsed.message ?? detail;
    } catch {
      /* not JSON; the trimmed body is all there is */
    }
    return { ok: false, message: `${response.status}: ${detail}` };
  }

  let body: { access_token?: string };
  try {
    body = JSON.parse(text) as { access_token?: string };
  } catch {
    return { ok: false, message: "Unreadable reply from the token endpoint." };
  }
  if (!body.access_token) return { ok: false, message: "No access token in the reply." };
  return { ok: true, token: body.access_token };
}

export function listOrganizations(token: string) {
  return call<Org[]>(token, "/v1/organizations");
}

/**
 * Create a project.
 *
 * The body is exactly the fields the current API accepts and no others. That
 * is not tidiness: the request schema is `additionalProperties: false`, so a
 * key the server does not know fails the whole call, and the "send both
 * spellings and let the server pick" hedge this used to carry was fatal here
 * in two independent ways, each confirmed against the live API:
 *
 *   - `region` is mutually exclusive with `region_selection`. Sending both got
 *     400 "Either region or region_selection must be defined, but not both."
 *     A field and its replacement are rejected together, not merged.
 *   - `region_selection` is a discriminated union, and only the `specific` arm
 *     takes an AWS region code; `smartGroup` takes `americas` / `emea` /
 *     `apac`. Passing an AWS code as a `smartGroup` got 400
 *     "region_selection.code: Invalid option: expected one of ...", so project
 *     creation could never have succeeded, with or without the clash above.
 *
 * `organization_id` is dropped for the milder reason that it is deprecated in
 * favour of `organization_slug`, not because sending it was itself rejected.
 *
 * `desired_instance_size` is omitted so Supabase gives the smallest instance
 * the organisation's plan allows, which is what a free-tier owner expects and
 * what the previous hardcoded `micro` would have quietly overridden.
 *
 * The database password is generated by the caller and deliberately thrown
 * away. OpenDepartment never connects to the database directly -- everything
 * goes through PostgREST with the anon key -- so keeping it would be keeping a
 * credential for no reason. The owner resets it from their own dashboard if
 * they ever need it, which is a documented one-click operation.
 */
export function createProject(
  token: string,
  opts: { name: string; org: Org; region: string; dbPass: string }
) {
  return call<{ ref?: string; id?: string; name: string; status?: string }>(
    token,
    "/v1/projects",
    {
      method: "POST",
      body: JSON.stringify({
        name: opts.name,
        organization_slug: opts.org.slug ?? opts.org.id,
        db_pass: opts.dbPass,
        region_selection: { type: "specific", code: opts.region },
      }),
    }
  );
}

/**
 * The project ref, by whichever name this project's vintage answers to.
 *
 * `id` is the older spelling and is marked deprecated in favour of `ref`; both
 * carry the same twenty-character value. Reading `id` first, as this used to,
 * meant depending on a field the API has already promised to stop sending.
 */
export function projectRef(project: { ref?: string; id?: string }): string {
  return project.ref ?? project.id ?? "";
}

/**
 * One project, by ref.
 *
 * Used to tell "this project is still coming up" apart from "this project does
 * not exist", which the health endpoint alone cannot do for a caller that is
 * resuming: a ref that names nothing 404s exactly like one that names a
 * project mid-creation does while its services are still registering.
 */
export function getProject(token: string, ref: string) {
  return call<{ ref?: string; id?: string; name?: string; status?: string }>(
    token,
    `/v1/projects/${ref}`
  );
}

/**
 * Delete a project, and everything in it.
 *
 * The counterpart to createProject(), and the only call in this file that
 * destroys something rather than making it. Two things follow from that:
 *
 *   - The caller derives the ref from a department row the operator OWNS,
 *     never from the request body. A token authorised for an organisation can
 *     delete anything in it, so an endpoint that took a ref from the browser
 *     would be a way to spend somebody's own authorisation on a project they
 *     did not mean to name.
 *   - A 404 is not a failure. It means the project is already gone -- deleted
 *     from the dashboard a minute ago, or by a retry of this same call -- and
 *     reporting that as an error sends somebody to a dashboard to look for a
 *     project that is not there.
 *
 * Same scope as creating one (`projects:write`). An OAuth app published before
 * this existed therefore needs no new consent from anybody who already
 * authorised it.
 */
export function deleteProject(token: string, ref: string) {
  return call<{ ref?: string; id?: string; name?: string }>(
    token,
    `/v1/projects/${ref}`,
    { method: "DELETE" }
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
 * The key a department's visitors are handed, by whichever name this project's
 * vintage uses.
 *
 * `reveal=true` is needed for the newer key format; the legacy JWT keys come
 * back without it. Asking for the reveal and falling back covers both.
 *
 * A current project answers with BOTH kinds, in this order:
 *
 *   {name: "anon",    type: "legacy",      api_key: "eyJhbGciOi..."}
 *   {name: "default", type: "publishable", api_key: "sb_publishable_..."}
 *
 * which is worth writing down, because it makes "find the first entry that
 * looks right" the wrong shape twice over. The publishable key is named
 * `default`, not `publishable`, so matching on that name never fires; and a
 * plain `find` over the array takes whichever Supabase happened to list first,
 * which is the legacy key it is in the process of retiring. So the type is
 * asked for by name, in order of preference, rather than left to array order.
 *
 * Both are safe to hand out and both are accepted downstream -- the control
 * plane stores either, and the probe rejects only `service_role` keys.
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

    const publishable = result.data.find(
      (k) => k.type === "publishable" && k.api_key
    );
    if (publishable?.api_key) return publishable.api_key;

    // Older projects have no publishable key at all; the legacy anon JWT is
    // the only thing there is, and it still works.
    const legacy = result.data.find((k) => k.name === "anon" && k.api_key);
    if (legacy?.api_key) return legacy.api_key;
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
