import { notFound, redirect } from "next/navigation";
import { resolveDepartment, type Department } from "@/lib/control/departments";
import { createTenantClient } from "./server";
import { getBranding, type Branding } from "./branding";
import type { Profile } from "./types";

export type DepartmentContext = {
  dept: Department;
  branding: Branding;
};

export type Member = DepartmentContext & {
  userId: string;
  email: string;
  profile: Profile;
};

/** Resolve the slug or 404. Every department route starts here. */
export async function requireDepartment(
  slug: string
): Promise<DepartmentContext> {
  const dept = await resolveDepartment(slug);
  if (!dept) notFound();
  return { dept, branding: await getBranding(dept) };
}

/**
 * Gate for every page behind a department's login.
 *
 * Order matters: no session -> login; no profile -> their database refused
 * them; banned -> suspended notice; no username -> pick one first.
 *
 * Note that the profile lookup runs as the visitor under the tenant's own RLS.
 * OpenDepartment has no elevated access to anyone's project, so a bug here
 * cannot leak across departments -- there is nothing to leak.
 */
export async function requireMember(
  slug: string,
  options?: { allowMissingUsername?: boolean }
): Promise<Member> {
  const ctx = await requireDepartment(slug);
  const supabase = await createTenantClient(ctx.dept);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/d/${slug}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, is_admin, is_banned, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect(`/d/${slug}/access-denied`);
  if (profile.is_banned) redirect(`/d/${slug}/access-denied?reason=banned`);
  if (!profile.username && !options?.allowMissingUsername) {
    redirect(`/d/${slug}/onboarding`);
  }

  return {
    ...ctx,
    userId: user.id,
    email: user.email ?? "",
    profile: profile as Profile,
  };
}

/** Same, but also insists on administrator clearance. */
export async function requireDeptAdmin(slug: string): Promise<Member> {
  const member = await requireMember(slug);
  if (!member.profile.is_admin) redirect(`/d/${slug}/vault`);
  return member;
}

/** Non-redirecting variant, for route handlers that return JSON. */
export async function getMember(slug: string): Promise<Member | null> {
  const dept = await resolveDepartment(slug);
  if (!dept) return null;

  const supabase = await createTenantClient(dept);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, is_admin, is_banned, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.is_banned) return null;

  return {
    dept,
    branding: await getBranding(dept),
    userId: user.id,
    email: user.email ?? "",
    profile: profile as Profile,
  };
}
