import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveDepartmentCached } from "@/lib/control/cache";
import { tenantCookieConfig } from "@/lib/tenant/cookies";

type CookieBundle = { name: string; value: string; options?: CookieOptions };

/**
 * OpenDepartment runs two independent session realms on one origin.
 *
 *  - The CONTROL PLANE: a person's OpenDepartment account, used only to
 *    register and manage departments. Lives in our own Supabase project.
 *  - A DEPARTMENT: a membership inside somebody else's Supabase project,
 *    scoped to /d/<slug> by cookie path.
 *
 * They never mix. Being signed in to the control plane grants nothing inside
 * any department, and being an admin of a department says nothing about who
 * you are here.
 */

/**
 * Paths inside /d/<slug>/ that a signed-out visitor may reach.
 *
 * `legal` is on the list because a department's imprint, terms and privacy
 * notice have to be readable by somebody who is not a member -- an imprint
 * only members can read is not an imprint, and the reader who needs it most is
 * the stranger deciding who to complain to. They render from
 * department_identity(), which is `security definer` and exposes nothing a
 * front door does not already show.
 */
const TENANT_PUBLIC = [
  "", "login", "join", "auth", "access-denied", "legal",
];

/**
 * Control-plane paths that require an OpenDepartment account.
 *
 * /new is deliberately NOT here. Someone should be able to name their
 * department, read the SQL and get most of the way through setup before being
 * asked to create an account; the wizard asks for one at the last step, where
 * registering the slug actually needs an owner to attach it to.
 */
const CONTROL_PRIVATE = ["/account"];

/**
 * Carved out of CONTROL_PRIVATE: the pages you use to *get* a session. Without
 * this exception /account/login would be gated behind /account/login.
 */
const CONTROL_PUBLIC = ["/account/login", "/account/auth"];

/**
 * Content Security Policy, built per request so it can carry a nonce.
 *
 * It used to live in next.config.ts, where it could only ever be one fixed
 * string -- and a fixed string cannot carry a nonce, so script-src had to say
 * `'unsafe-inline'` to let Next's own bootstrap scripts run. That is the one
 * directive an XSS actually cares about, and with it present the policy was a
 * set of useful side conditions rather than a backstop.
 *
 * Next reads the nonce out of the Content-Security-Policy header on the
 * REQUEST and stamps it onto the script tags it emits, which is why the header
 * is set on both halves below.
 *
 * `'strict-dynamic'` means the host allowlist in script-src is ignored by
 * browsers that understand it: nothing runs unless it carries this request's
 * nonce or was loaded by something that did. The Ko-fi widget still works,
 * because it is injected by KofiButton -- an already-trusted script -- rather
 * than by a tag in the HTML. Its host stays in the list for older browsers,
 * which ignore 'strict-dynamic' and fall back to the allowlist.
 *
 * style-src keeps 'unsafe-inline'. Next emits inline styles, and the accent
 * colour reaches the page as a style ATTRIBUTE (`style={{ "--accent": ... }}`),
 * which no nonce can cover -- a nonce applies to <style> elements, never to
 * attributes. The value substituted there is fenced at three separate points
 * instead: a CHECK constraint in the tenant schema, a hex test on the way out
 * of getBranding(), and the assertions covering both.
 */
const SUPABASE = "https://*.supabase.co https://*.supabase.in";

function contentSecurityPolicy(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://storage.ko-fi.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${SUPABASE} https://storage.ko-fi.com https://cdn.ko-fi.com`,
    `media-src 'self' blob: ${SUPABASE}`,
    `object-src 'self' ${SUPABASE}`,
    `frame-src 'self' ${SUPABASE}`,
    `connect-src 'self' ${SUPABASE}`,
    `font-src 'self' data:`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

function controlConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY
  );
}

export async function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce);

  // Forwarded to the render. Next looks for the nonce here, and x-nonce is for
  // any component that has to stamp one on a tag itself.
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp);

  const response = await dispatch(request, headers);

  // Every path out of here gets the policy, redirects included: one missed
  // branch is one unprotected page, and there are five of them below.
  response.headers.set("content-security-policy", csp);
  return response;
}

async function dispatch(
  request: NextRequest,
  headers: Headers
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/d/")) return tenantMiddleware(request, headers);
  // Pinned departments still need canonical paths and refreshed cookies even
  // when this deployment does not have a control plane.
  if (!controlConfigured()) return NextResponse.next({ request: { headers } });
  if (
    CONTROL_PRIVATE.some((p) => pathname.startsWith(p)) &&
    !CONTROL_PUBLIC.some((p) => pathname.startsWith(p))
  ) {
    return controlMiddleware(request, headers);
  }
  return NextResponse.next({ request: { headers } });
}

/** Refreshes the visitor's token for one department and gates its pages. */
async function tenantMiddleware(request: NextRequest, headers: Headers) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const slug = segments[1];
  const rest = segments.slice(2);

  let response = NextResponse.next({ request: { headers } });
  if (!slug) return response;

  const dept = await resolveDepartmentCached(slug);
  // Unknown or suspended: let the route render its own 404 rather than
  // guessing here.
  if (!dept) return response;

  /**
   * One address per department, in the department's own spelling.
   *
   * A slug is stored lower case and resolve_department() lower-cases what it
   * is asked, so /d/MyDept resolves perfectly well -- and then breaks, because
   * the two halves of the session disagree about where the cookie lives. The
   * cookie is named and pathed from the slug: this middleware and the browser
   * client take it from the URL (`od-MyDept` at `/d/MyDept`), while every
   * server client takes it from the resolved row (`od-mydept` at `/d/mydept`).
   * Cookie paths are matched case-sensitively, so the two never meet.
   *
   * The visible symptom was a redirect loop rather than a mere sign-in
   * failure: the middleware saw the cookie and bounced /login to /vault, and
   * requireMember() did not and bounced /vault back to /login, until the
   * browser gave up.
   *
   * Redirecting to the canonical spelling fixes it at the only place that can:
   * everything downstream then agrees, because there is only one spelling
   * left. 308 rather than 307 -- this is a permanent fact about the address,
   * and the method is worth preserving for a POST that arrives mis-cased.
   */
  if (slug !== dept.slug) {
    const canonical = request.nextUrl.clone();
    canonical.pathname = [`/d/${dept.slug}`, ...rest].join("/");
    return NextResponse.redirect(canonical, 308);
  }

  const supabase = createServerClient(dept.supabase_url, dept.anon_key, {
    cookieOptions: tenantCookieConfig(dept.slug),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieBundle[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        headers.set("cookie", request.cookies.toString());
        response = NextResponse.next({ request: { headers } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            path: `/d/${dept.slug}`,
          })
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const head = rest[0] ?? "";
  const isPublic = TENANT_PUBLIC.includes(head);

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = `/d/${dept.slug}/login`;
    url.searchParams.set("next", request.nextUrl.pathname);
    return redirectWithCookies(url, response);
  }

  // A member landing on the front door or the login page wants the archive.
  if (user && (head === "" || head === "login")) {
    const url = request.nextUrl.clone();
    url.pathname = `/d/${dept.slug}/vault`;
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

/** Refreshes the OpenDepartment account session. */
async function controlMiddleware(request: NextRequest, headers: Headers) {
  let response = NextResponse.next({ request: { headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieBundle[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          headers.set("cookie", request.cookies.toString());
          response = NextResponse.next({ request: { headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/account/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, refreshed: NextResponse) {
  const redirect = NextResponse.redirect(url);
  for (const cookie of refreshed.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)",
  ],
};
