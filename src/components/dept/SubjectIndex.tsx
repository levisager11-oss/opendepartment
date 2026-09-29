"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";

export type SubjectSummary = {
  id: string;
  name: string;
  description: string | null;
  /** Documents the vault shows under this subject. */
  count: number;
  /** When the newest of them was filed, or null for an empty subject. */
  latest: string | null;
};

const FOLDER = "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";

/**
 * The subject register: every subject as a card that opens the vault filtered
 * to it. Until this existed the only way to see what subjects there were was
 * the vault's dropdown, which shows names and nothing else -- not what a
 * subject is about, and not whether anything is filed under it.
 */
export function SubjectIndex({
  subjects,
  isAdmin,
}: {
  subjects: SubjectSummary[];
  isAdmin: boolean;
}) {
  const { t, plural, formatDate } = useI18n();
  const { branding, href } = useTenant();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="mb-6">
        <span className="docket text-2xs text-ink-500">
          {branding.subjectLabel.toUpperCase()} INDEX
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight break-words text-ink-900 sm:text-4xl">
          {t("subjects.title")}
        </h1>
        <p className="mt-1.5 text-sm text-ink-500">
          {plural("subjects.count", subjects.length)}
        </p>
      </div>

      {subjects.length === 0 ? (
        <div className="paper px-6 py-16 text-center">
          <span className="stamp stamp-red text-sm">NO RECORDS</span>
          <p className="mt-5 text-ink-500">{t("subjects.empty")}</p>
          {isAdmin && (
            <Link href={`${href("admin")}?tab=subjects`} className="btn btn-primary mt-6">
              {t("subjects.manage")}
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {subjects.map((subject) => (
            <li key={subject.id} className="flex">
              <Link
                href={`${href("vault")}?subject=${encodeURIComponent(subject.id)}`}
                className={`paper lift group flex w-full flex-col p-5 ${
                  subject.count === 0 ? "opacity-70" : ""
                }`}
              >
                <h2 className="flex items-start gap-2 text-base font-semibold break-words text-ink-900 group-hover:text-gov-800">
                  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className="mt-0.5 shrink-0 text-ink-400">
                    <path d={FOLDER} />
                  </svg>
                  {subject.name}
                </h2>
                {subject.description ? (
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-700">
                    {subject.description}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-ink-400">{t("subjects.noDescription")}</p>
                )}
                <p className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 text-xs text-ink-500">
                  <span className="font-medium text-ink-700">{plural("vault.count", subject.count)}</span>
                  {subject.latest && (
                    <span>{t("subjects.latest", { date: formatDate(subject.latest) })}</span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isAdmin && subjects.length > 0 && (
        <p className="mt-6 text-sm">
          <Link
            href={`${href("admin")}?tab=subjects`}
            className="font-medium text-gov-800 hover:underline"
          >
            {t("subjects.manage")}
          </Link>
        </p>
      )}
    </div>
  );
}
