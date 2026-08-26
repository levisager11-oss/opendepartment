import { Suspense } from "react";
import { requireDepartment } from "@/lib/tenant/auth";
import { DeptLoginForm } from "@/components/dept/DeptLoginForm";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

/**
 * Member-only, so it stays out of the index even when the department
 * itself is public. The canonical is left to the department layout on
 * purpose: one address per archive, not one per screen.
 */
export const metadata = privatePage("Sign in");

export default async function DepartmentLoginPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
          idPrefix="login"
        />
        <h1 className="font-serif text-2xl font-black break-words text-ink-900">
          <T k="auth.title" />
        </h1>
        <p className="docket mt-2 text-2xs text-ink-500">
          <T k="auth.subtitle" />
        </p>
      </div>

      <div className="paper p-6">
        {/* useSearchParams needs a Suspense boundary to keep the rest of the
            page from opting out of static rendering. */}
        <Suspense fallback={null}>
          <DeptLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
