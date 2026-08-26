import Link from "next/link";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

export const metadata = privatePage("Department not found");

/**
 * The department-level fallback, for a notFound() thrown by a *page* under
 * /d/[slug] -- currently requireDepartment() in lib/tenant/auth.ts.
 *
 * Worth knowing, because it is not what you would guess: an unknown slug does
 * NOT land here. That notFound() is thrown by this segment's own layout.tsx,
 * and a segment's not-found boundary does not catch its own layout -- the
 * error passes it and is answered by the root not-found.tsx instead. That page
 * therefore carries the "check the address" copy and the link to the
 * directory, because it is the one people actually see after mistyping a slug.
 */
export default function DepartmentNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
      <Seal size={90} className="mb-8 opacity-50" idPrefix="dnf" />

      <h1 className="stamp stamp-red mb-6 inline-block text-lg">
        <T k="error.deptNotFound" />
      </h1>

      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        <T k="error.deptNotFoundBody" />
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link href="/directory" className="btn btn-primary">
          <T k="od.directory" />
        </Link>
        <Link
          href="/new"
          className="text-sm text-ink-700 underline underline-offset-4 hover:text-ink-900"
        >
          <T k="od.create" />
        </Link>
      </div>
    </div>
  );
}
