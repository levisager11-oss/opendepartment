import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { detectLocale } from "@/lib/i18n/detect";
import { getLegalDoc, type LegalDoc } from "@/lib/legal";
import { MarketingShell } from "@/components/MarketingShell";
import { pageMetadata } from "@/lib/seo";

// An imprint that only exists for departments is not an imprint for the
// platform, which is itself a service somebody operates and can be complained
// about. The route is generated like the other two rather than being a special
// case; getLegalDoc() renders it from the same operator identity contactLine()
// already builds for the footer.
const DOCS: LegalDoc[] = ["terms", "privacy", "imprint"];

/**
 * Rendered per request, for two reasons that arrived together.
 *
 * The page picks its language from a cookie and Accept-Language, and a
 * prerendered copy was picked at build time with neither -- so a German
 * visitor was served English and the language toggle was the only way out.
 *
 * And the Content Security Policy now carries a per-request nonce. HTML held
 * in a build-time cache would carry whatever nonce that build had, which is
 * not the one in the header the middleware sets, so its scripts would be
 * refused. Everything else in the app was already dynamic; these two pages
 * were the exception.
 */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ doc: string }>;
}): Promise<Metadata> {
  const { doc } = await params;
  if (!DOCS.includes(doc as LegalDoc)) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }
  const locale = await detectLocale();
  const { title, description } = getLegalDoc(doc as LegalDoc, locale);

  return pageMetadata({ title, description, path: `/legal/${doc}` });
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ doc: string }>;
}) {
  const { doc } = await params;
  if (!DOCS.includes(doc as LegalDoc)) notFound();

  const locale = await detectLocale();
  const { title, updated, sections } = getLegalDoc(doc as LegalDoc, locale);

  return (
    <MarketingShell>
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
    </MarketingShell>
  );
}
