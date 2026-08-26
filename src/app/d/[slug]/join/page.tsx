import { Suspense } from "react";
import { requireDepartment } from "@/lib/tenant/auth";
import { DeptLoginForm } from "@/components/dept/DeptLoginForm";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";

/**
 * Invite landing page. An invite link is just /d/<slug>/join?code=XYZ, so a
 * code can be handed out in a group chat and the recipient lands on a sign-up
 * form with the code already filled in.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { slug } = await params;
  const { code } = await searchParams;
  const { branding } = await requireDepartment(slug);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-8 text-center">
        <Seal
          size={80}
          className="mx-auto mb-5"
          top={branding.sealTop}
          bottom={branding.sealBottom}
          accent={branding.accent}
          idPrefix="join"
        />
        <h1 className="font-[family-name:var(--font-serif)] text-2xl font-black text-ink-900">
          <T k="invite.title" vars={{ name: branding.departmentName }} />
        </h1>
      </div>

      <div className="paper p-6">
        <Suspense fallback={null}>
          <DeptLoginForm initialMode="signup" presetInvite={code} />
        </Suspense>
      </div>
    </div>
  );
}
