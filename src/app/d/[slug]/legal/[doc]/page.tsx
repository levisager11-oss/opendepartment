import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireDepartment } from "@/lib/tenant/auth";
import { detectLocale } from "@/lib/i18n/detect";
import { translate } from "@/lib/i18n/dictionary";
import {
  DEPT_LEGAL_DOCS,
  getDeptLegalDoc,
  type DeptLegalDoc,
} from "@/lib/tenant/legal";
import { privatePage } from "@/lib/seo";

/**
 * A department's own terms, privacy notice and legal notice.
 *
 * Public on purpose: these are the pages a person who has been written about
 * needs, and that person is by definition not a member. So this route is in
 * TENANT_PUBLIC in middleware.ts -- gating "who is responsible for this
 * archive" behind the archive's own login would defeat the point of naming an
 * operator at all.
 *
 * Kept out of the search index either way. The text is generated from one
 * settings row and is near-identical across departments, so indexing it would
 * put a thousand copies of the same three pages in front of the front doors
 * that are actually worth finding.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; doc: string }>;
}): Promise<Metadata> {
  const { slug, doc } = await params;
  if (!DEPT_LEGAL_DOCS.includes(doc as DeptLegalDoc)) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const { branding } = await requireDepartment(slug);
  const locale = await detectLocale();
  const { title } = getDeptLegalDoc(doc as DeptLegalDoc, branding, locale);

  return privatePage(title);
}

export default async function DeptLegalPage({
  params,
}: {
  params: Promise<{ slug: string; doc: string }>;
}) {
  const { slug, doc } = await params;
  if (!DEPT_LEGAL_DOCS.includes(doc as DeptLegalDoc)) notFound();

  const { branding } = await requireDepartment(slug);
  const locale = await detectLocale();
  const { title, sections } = getDeptLegalDoc(
    doc as DeptLegalDoc,
    branding,
    locale
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <article className="paper p-5 sm:p-8">
        <span className="docket text-2xs text-ink-500">
          {branding.departmentName}
        </span>
        <h1 className="mt-1 mb-8 font-serif text-2xl font-black break-words text-ink-900 sm:text-3xl">
          {title}
        </h1>

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

        <p className="mt-10 border-t border-paper-300 pt-5 text-xs text-ink-500">
          {translate(locale, "legal.platformPointer")}{" "}
          <Link
            href="/legal/terms"
            className="text-gov-800 underline underline-offset-2"
          >
            {translate(locale, "legal.terms")}
          </Link>
          {" · "}
          <Link
            href="/legal/privacy"
            className="text-gov-800 underline underline-offset-2"
          >
            {translate(locale, "legal.privacy")}
          </Link>
        </p>
      </article>
    </div>
  );
}
