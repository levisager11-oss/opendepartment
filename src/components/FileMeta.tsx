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
    <dl className="divide-y divide-paper-300 text-sm">
      {rows.map(([label, value]) => (
        // Label and value side by side at every width. Stacked, eight facts
        // took sixteen lines.
        <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-2.5">
          <dt className="shrink-0 text-ink-500">{label}</dt>
          <dd className="min-w-0 truncate text-right font-medium text-ink-900">
            {value}
          </dd>
        </div>
      ))}

      {/* Admin-only. Sits under a redaction bar you have to deliberately
          reveal -- so an admin does not flash a classmate's address at
          whoever happens to be looking at their screen. */}
      {ownerEmail && (
        <div className="flex items-baseline justify-between gap-4 px-5 py-2.5">
          <dt className="shrink-0 text-stamp-red">
            {t("file.uploaderEmail")}
          </dt>
          <dd className="min-w-0 break-all text-right">
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
