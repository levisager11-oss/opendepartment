"use client";

import { useI18n } from "@/lib/i18n/provider";
import { useTenant } from "@/lib/tenant/context";
import { caseLabel, formatBytes, type CaseFile } from "@/lib/tenant/types";

export function FileMeta({
  file,
  ownerEmail,
}: {
  file: CaseFile;
  ownerEmail: string | null;
  signedUrl: string | null;
}) {
  const { t, formatDate } = useI18n();
  const { branding } = useTenant();

  const rows: Array<[string, React.ReactNode]> = [
    [t("file.case"), caseLabel(file.case_number, branding.docketPrefix)],
    [t("file.submittedBy"), file.owner_username ?? "—"],
    [t("file.submittedOn"), formatDate(file.created_at)],
    [t("file.category"), file.category],
    [t("file.type"), file.mime_type],
    [t("file.size"), formatBytes(file.size_bytes)],
    [t("file.views"), String(file.view_count)],
    [
      t("vote.score"),
      `${file.upvotes > 0 ? "+" : ""}${file.upvotes} / −${file.downvotes}`,
    ],
  ];

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 border-b border-paper-300 p-4 sm:grid-cols-2 sm:gap-y-3 sm:p-5">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3">
          <dt className="docket shrink-0 text-3xs text-ink-500 sm:w-32">{label}</dt>
          <dd className="typewriter min-w-0 truncate text-sm text-ink-900">
            {value}
          </dd>
        </div>
      ))}

      {/* Admin-only. Sits under a redaction bar you have to deliberately
          reveal -- so an admin does not flash a classmate's address at
          whoever happens to be looking at their screen. */}
      {ownerEmail && (
        <div className="flex flex-col sm:col-span-2 sm:flex-row sm:items-baseline sm:gap-3">
          <dt className="docket shrink-0 text-3xs text-stamp-red sm:w-32">
            {t("file.uploaderEmail")}
          </dt>
          <dd>
            <span
              tabIndex={0}
              className="redact redact-reveal typewriter px-1 text-sm"
              title={t("file.uploaderEmail")}
            >
              {ownerEmail}
            </span>
          </dd>
        </div>
      )}
    </dl>
  );
}
