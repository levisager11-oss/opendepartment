import { NextResponse, type NextRequest } from "next/server";
import { resolveDepartment } from "@/lib/control/departments";
import { createTenantClient } from "@/lib/tenant/server";

/**
 * E-mail-link landing point for one department.
 *
 * This lives under /d/<slug>/ rather than at a shared /auth/callback because
 * the session cookie is scoped to that path -- a callback at the site root
 * could not write a cookie the department's own pages would receive back.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  // Behind Vercel's proxy request.url carries the internal host, which would
  // send people to an unreachable address after signing in. The forwarded
  // headers carry what the browser actually used, and deriving it per request
  // means preview deployments work without extra configuration.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const base = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  const home = `${base}/d/${slug}`;

  // Only ever bounce to somewhere inside this department.
  const requested = searchParams.get("next") ?? `/d/${slug}/vault`;
  const safeNext = requested.startsWith(`/d/${slug}`)
    ? requested
    : `/d/${slug}/vault`;

  if (errorDescription) {
    return NextResponse.redirect(`${home}/access-denied`);
  }
  if (!code) {
    return NextResponse.redirect(`${home}/login`);
  }

  const dept = await resolveDepartment(slug);
  if (!dept) return NextResponse.redirect(`${base}/`);

  const supabase = await createTenantClient(dept);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("database error") || message.includes("dept_")) {
      return NextResponse.redirect(`${home}/access-denied`);
    }
    return NextResponse.redirect(`${home}/login?error=auth`);
  }

  // Members without a cover name get sent to pick one; requireMember() on the
  // destination handles that, so a plain redirect is enough here.
  return NextResponse.redirect(`${base}${safeNext}`);
}
