import Link from "next/link";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { privatePage } from "@/lib/seo";

export const metadata = privatePage("Page not found");

/**
 * The site-wide 404 -- and, less obviously, the one an unknown department slug
 * lands on. /d/[slug]/layout.tsx calls notFound() when it cannot resolve the
 * slug, and a layout's notFound passes its own segment's boundary, so this
 * page answers it rather than d/[slug]/not-found.tsx.
 *
 * That is why the directory link is here: after a mistyped or expired
 * department address, "browse the public ones" is the only useful next step.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <Seal size={90} className="mb-8 opacity-50" idPrefix="nf" />
      {/* The stamp is the page's heading, not decoration -- Tailwind's
          preflight resets heading size and weight, so the .stamp utility
          still renders it identically. */}
      <h1 className="stamp stamp-red mb-6 inline-block">404</h1>

      <p className="mb-8 text-sm leading-relaxed text-ink-700">
        <T k="error.notFound" />
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link href="/directory" className="btn btn-primary">
          <T k="od.directory" />
        </Link>
        <Link
          href="/"
          className="text-sm text-gov-800 underline underline-offset-4 hover:text-gov-600"
        >
          <T k="od.name" />
        </Link>
      </div>
    </div>
  );
}
