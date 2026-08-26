import Link from "next/link";
import { requireDepartment } from "@/lib/tenant/auth";
import { createTenantClient } from "@/lib/tenant/server";
import { DeptPasswordForm } from "@/components/dept/DeptPasswordForm";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * Where a reset link finally lands.
 *
 * Not behind requireMember: the visitor holds a recovery session and may well
 * have no username yet, and bouncing them to onboarding would leave the
 * password they came here to change exactly as it was. All this page needs is
 * a session, which the callback established a redirect ago.
 */
export const metadata = privatePage("Choose a new password");

export default async function UpdatePasswordPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { dept, branding } = await requireDepartment(slug);

  const supabase = await createTenantClient(dept);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="mb-8 text-center">
        <Seal
          size={80}
          className="mx-auto mb-5"
          top={branding.sealTop}
          bottom={branding.sealBottom}
          accent={branding.accent}
          idPrefix="reset"
        />
        <h1 className="font-serif text-2xl font-black break-words text-ink-900">
          <T k={user ? "auth.updateTitle" : "auth.linkExpired"} />
        </h1>
      </div>

      <div className="paper p-5 sm:p-6">
        {user ? (
          <>
            <p className="mb-5 text-sm leading-relaxed text-ink-700">
              <T k="auth.updateBody" />
            </p>
            <DeptPasswordForm />
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-ink-700">
              <T k="auth.linkExpiredBody" />
            </p>
            <Link href={`/d/${slug}/login`} className="btn btn-primary mt-6">
              <T k="auth.signin" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
