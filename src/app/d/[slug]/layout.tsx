import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveDepartment } from "@/lib/control/departments";
import { getBranding } from "@/lib/tenant/branding";
import { createTenantClient } from "@/lib/tenant/server";
import { TenantProvider } from "@/lib/tenant/context";
import { DeptBanner } from "@/components/dept/DeptBanner";
import { DeptHeader } from "@/components/dept/DeptHeader";
import { DeptFooter } from "@/components/dept/DeptFooter";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const dept = await resolveDepartment(slug);
  if (!dept) return { title: "Not found", robots: { index: false, follow: false } };

  const description =
    dept.tagline ??
    `${dept.display_name} -- a parody document archive on ${SITE_NAME}.`;

  return {
    // Share cards are worth having either way: an unlisted department is
    // still pasted into group chats, and noindex says nothing about how a
    // link unfurls there. The canonical points at the front door even from a
    // sub-route, so a department has one address in the index, not one per
    // page.
    ...pageMetadata({
      title: dept.display_name,
      description,
      path: `/d/${slug}`,
    }),
    // Overrides the plain string pageMetadata() returns. Without a template
    // here, a sub-page that sets `title: "The Vault"` would fall back to the
    // root layout's template and render "The Vault -- OpenDepartment",
    // dropping the one word that says which archive you are looking at.
    title: {
      default: dept.display_name,
      template: `%s -- ${dept.display_name}`,
    },
    // Unlisted departments stay out of search results. A department that opted
    // into the public directory is fair game.
    robots:
      dept.visibility === "public"
        ? { index: true, follow: true }
        : { index: false, follow: false },
  };
}

export default async function DepartmentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const dept = await resolveDepartment(slug);
  if (!dept) notFound();

  const branding = await getBranding(dept);

  // Identity for the header. Never expose the e-mail address here.
  let username: string | null = null;
  let isAdmin = false;
  let signedIn = false;

  try {
    const supabase = await createTenantClient(dept);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      signedIn = true;
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, is_admin")
        .eq("id", user.id)
        .maybeSingle();
      username = profile?.username ?? null;
      isAdmin = profile?.is_admin ?? false;
    }
  } catch {
    // The owner's project is unreachable or half-configured. Render the shell
    // anyway so the "finish your setup" screen below is readable.
  }

  return (
    <TenantProvider
      slug={slug}
      supabaseUrl={dept.supabase_url}
      anonKey={dept.anon_key}
      branding={branding}
    >
      {/* Every accent-coloured element downstream reads this variable. */}
      <div
        className="flex min-h-dvh flex-col"
        style={{ "--accent": branding.accent } as React.CSSProperties}
      >
        <DeptBanner />
        <DeptHeader signedIn={signedIn} username={username} isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
        <DeptFooter />
      </div>
    </TenantProvider>
  );
}
