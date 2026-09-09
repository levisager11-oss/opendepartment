"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The strip that tells a department's administrator there is a newer schema.
 *
 * Shown to administrators only, and only inside their own department. A member
 * cannot act on it -- running the SQL needs the Supabase project's own editor
 * -- and a visitor being told the archive they are reading is behind on a
 * database migration is being told something about somebody else's
 * housekeeping.
 *
 * Deliberately a strip under the header rather than a panel on the
 * administration screen alone: the administration screen is where the SQL and
 * the detail live, but nobody visits it unprompted, which is exactly the
 * problem a version stamp exists to solve. This is on every page they land on
 * after signing in, and it does not offer a dismiss button: the condition it
 * describes is still true tomorrow, and it goes away by being fixed.
 */
export function SchemaNotice({
  current,
  expected,
  adminHref,
}: {
  current: number | null;
  expected: number;
  adminHref: string;
}) {
  const { t } = useI18n();

  return (
    <div className="border-b border-gold-500/40 bg-gold-500/15">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs">
        <span className="stamp stamp-sm shrink-0 border-gold-600 text-gold-700">
          {t("schema.badge")}
        </span>
        <span className="text-ink-700">
          {current === null
            ? t("schema.noticeUnknown", { expected })
            : t("schema.notice", { current, expected })}
        </span>
        <Link
          href={adminHref}
          className="ml-auto shrink-0 font-semibold text-gov-800 underline underline-offset-2 hover:text-gov-600"
        >
          {t("schema.howTo")}
        </Link>
      </div>
    </div>
  );
}
