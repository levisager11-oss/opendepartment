import type { Metadata } from "next";
import Link from "next/link";
import { publicDirectory } from "@/lib/control/departments";
import { MarketingShell } from "@/components/MarketingShell";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Public departments",
  description:
    "Browse the parody document archives whose owners chose to be listed. "
    + "Most OpenDepartment departments are unlisted and reachable only by invitation.",
  path: "/directory",
});

/**
 * Only departments whose owner explicitly chose "public" appear here. The
 * default is unlisted, so this list is short by design and its emptiness is
 * not a bug.
 */
export default async function DirectoryPage() {
  const departments = await publicDirectory();

  return (
    <MarketingShell wide>
      <h1 className="mb-2 font-serif text-2xl font-black break-words text-ink-900 sm:text-3xl">
        <T k="od.directory" />
      </h1>
      <p className="mb-10 max-w-prose text-sm leading-relaxed text-ink-500">
        <T k="od.directoryNote" />
      </p>

      {departments.length === 0 ? (
        <div className="paper p-10 text-center">
          <Seal size={70} className="mx-auto mb-5 opacity-40" idPrefix="dir" />
          <p className="mb-6 text-sm text-ink-500">
            <T k="od.directoryEmpty" />
          </p>
          <Link
            href="/new"
            className="btn btn-primary"
          >
            <T k="od.create" />
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {departments.map((dept) => (
            <li key={dept.slug}>
              <Link
                href={`/d/${dept.slug}`}
                className="paper flex h-full items-start gap-4 p-5 transition-shadow hover:shadow-lg"
              >
                <Seal
                  size={44}
                  className="shrink-0"
                  top={dept.display_name}
                  idPrefix={`dir-${dept.slug}`}
                />
                <span className="min-w-0">
                  <span className="block font-serif text-base font-bold text-ink-900">
                    {dept.display_name}
                  </span>
                  {dept.tagline && (
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      {dept.tagline}
                    </span>
                  )}
                  <span className="docket mt-2 block text-3xs text-ink-500">
                    /d/{dept.slug}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MarketingShell>
  );
}
