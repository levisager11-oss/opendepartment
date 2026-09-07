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

function controlConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CONTROL_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_CONTROL_SUPABASE_ANON_KEY
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Not configured yet: let everything through so the setup page can render.
  if (!controlConfigured()) return NextResponse.next({ request });

  if (pathname.startsWith("/d/")) return tenantMiddleware(request);
  if (
    CONTROL_PRIVATE.some((p) => pathname.startsWith(p)) &&
    !CONTROL_PUBLIC.some((p) => pathname.startsWith(p))
  ) {
    return controlMiddleware(request);
  }
  return NextResponse.next({ request });
}

/** Refreshes the visitor's token for one department and gates its pages. */
async function tenantMiddleware(request: NextRequest) {
  const segments = request.nextUrl.pathname.split("/").filter(Boolean);
  const slug = segments[1];
  const rest = segments.slice(2);

  let response = NextResponse.next({ request });
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
        response = NextResponse.next({ request });
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
    return NextResponse.redirect(url);
  }

  // A member landing on the front door or the login page wants the archive.
  if (user && (head === "" || head === "login")) {
    const url = request.nextUrl.clone();
    url.pathname = `/d/${dept.slug}/vault`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

/** Refreshes the OpenDepartment account session. */
async function controlMiddleware(request: NextRequest) {
  let response = NextResponse.next({ request });

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
          response = NextResponse.next({ request });
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
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)",
  ],
};
