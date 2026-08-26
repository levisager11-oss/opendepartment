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
 * `legal` is on the list deliberately. A department's terms, privacy notice
 * and legal notice exist so that somebody written about in the archive can
 * find out who is answerable for it -- and that person is, by definition, not
 * a member. Putting "who runs this" behind the archive's own login would
 * defeat the whole point of naming an operator.
 */
const TENANT_PUBLIC = ["", "login", "join", "auth", "access-denied", "legal"];

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

  const supabase = createServerClient(dept.supabase_url, dept.anon_key, {
    cookieOptions: tenantCookieConfig(slug),
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
            path: `/d/${slug}`,
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
    url.pathname = `/d/${slug}/login`;
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // A member landing on the front door or the login page wants the archive.
  if (user && (head === "" || head === "login")) {
    const url = request.nextUrl.clone();
    url.pathname = `/d/${slug}/vault`;
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
