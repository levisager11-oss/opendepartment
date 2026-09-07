import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveDepartment } from "@/lib/control/departments";
import { getBranding } from "@/lib/tenant/branding";
import { detectLocale } from "@/lib/i18n/detect";
import { getDeptLegalDoc, type DeptLegalDoc } from "@/lib/tenant/legal";
import { pageMetadata } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

/**
 * The body shared by a department's three legal routes.
 *
 * They are three real route folders rather than one [doc] segment on purpose.
 * The department layout above is dynamic -- it reads cookies -- so the response
 * has already begun streaming by the time a page under it runs, and a
 * notFound() thrown down there renders the not-found UI into a status 200.
 * Giving each document its own route means an unknown path matches no route at
 * all and Next answers it before any of that, which is where a 404 belongs.
 */
export function deptLegalMetadata(doc: DeptLegalDoc) {
  return async function generateMetadata({
    params,
  }: {
    params: Params;
  }): Promise<Metadata> {
    const { slug } = await params;
    const dept = await resolveDepartment(slug);
    if (!dept) {
      return { title: "Not found", robots: { index: false, follow: false } };
    }

    const branding = await getBranding(dept);
    const locale = await detectLocale();
    const { title, description } = getDeptLegalDoc(doc, locale, branding);

    // Deliberately NOT following the department's visibility, unlike every
    // other page under /d/<slug>. An imprint and a privacy notice exist so
    // that somebody with a complaint can find who is answerable, and a
    // document nobody can look up does not do that job. These three pages
    // carry the operator's name and contact and nothing else -- no member
    // list, no exhibit, no title of anything in the archive -- so indexing
    // them tells a search engine who runs an archive, not what is in it.
    //
    // Stated explicitly rather than simply omitted: metadata from a page
    // merges over its layout's field by field, so leaving `robots` out here
    // would inherit the noindex the department layout emits for an unlisted
    // archive -- which is exactly the rule these three pages opt out of.
    return {
      ...pageMetadata({ title, description, path: `/d/${slug}/legal/${doc}` }),
      robots: { index: true, follow: true },
    };
  };
}

export async function DeptLegalPage({
  doc,
  params,
}: {
  doc: DeptLegalDoc;
  params: Params;
}) {
  const { slug } = await params;
  const dept = await resolveDepartment(slug);
  if (!dept) notFound();

  const branding = await getBranding(dept);
  const locale = await detectLocale();
  const { title, updated, sections } = getDeptLegalDoc(doc, locale, branding);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <article className="paper p-5 sm:p-8">
        <h1 className="mb-1 font-serif text-2xl font-black break-words text-ink-900 sm:text-3xl">
          {title}
        </h1>
        <p className="docket mb-8 text-2xs text-ink-500">{updated}</p>

        <div className="space-y-7">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-2 font-serif text-lg font-bold text-ink-900">
                {section.heading}
              </h2>
              {section.body.map((paragraph, i) => (
                <p
                  key={i}
                  className="mb-2 max-w-prose text-sm leading-relaxed text-ink-700"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
