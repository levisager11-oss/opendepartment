import { Suspense } from "react";
import { requireDepartment } from "@/lib/tenant/auth";
import { DeptLoginForm } from "@/components/dept/DeptLoginForm";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";

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
        <h1 className="font-[family-name:var(--font-serif)] text-2xl font-black text-ink-900">
          <T k="auth.title" />
        </h1>
        <p className="docket mt-2">
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
