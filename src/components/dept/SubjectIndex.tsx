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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <span className="docket text-2xs text-ink-500">
          {branding.subjectLabel.toUpperCase()} INDEX
        </span>
        <h1 className="font-serif text-2xl font-black break-words text-gov-900 sm:text-3xl">
          {t("subjects.title")}
        </h1>
        <p className="typewriter mt-1 text-sm text-ink-500">
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
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <li key={subject.id} className="flex">
              <Link
                href={`${href("vault")}?subject=${encodeURIComponent(subject.id)}`}
                className={`paper group flex w-full flex-col p-4 transition-shadow hover:shadow-md sm:p-5 ${
                  subject.count === 0 ? "opacity-70" : ""
                }`}
              >
                <h2 className="font-serif text-lg font-bold break-words text-gov-900 group-hover:underline">
                  {subject.name}
                </h2>
                {subject.description ? (
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-700">
                    {subject.description}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-ink-400">{t("subjects.noDescription")}</p>
                )}
                <p className="docket mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-4 text-3xs text-ink-500">
                  <span className="text-gov-800">{plural("vault.count", subject.count)}</span>
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
            className="text-gov-800 underline underline-offset-2 hover:text-gov-600"
          >
            {t("subjects.manage")}
          </Link>
        </p>
      )}
    </div>
  );
}
