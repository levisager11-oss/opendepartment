"use client";

import { useI18n } from "@/lib/i18n/provider";
import type { AuditEntry } from "./types";

export function AdminAudit({ entries }: { entries: AuditEntry[] }) {
  const { t, formatDate } = useI18n();

  return (
    <div className="paper scroll-x rounded-xs">
      <table className="w-full min-w-2xl text-sm">
        <thead>
          <tr className="border-b border-paper-300 text-left">
            {[
              t("admin.audit.when"),
              t("admin.audit.action"),
              t("admin.audit.actor"),
              "",
            ].map((label, i) => (
              <th key={i} className="docket px-3 py-2 !text-[0.6rem]">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-paper-200 hover:bg-paper-100"
            >
              <td className="px-3 py-2 text-xs whitespace-nowrap text-ink-500">
                {formatDate(entry.created_at)}
              </td>
              <td className="typewriter px-3 py-2 whitespace-nowrap">
                {entry.action}
              </td>
              <td className="typewriter px-3 py-2 whitespace-nowrap text-gov-800">
                {entry.actor_username ?? "—"}
              </td>
              <td className="max-w-md px-3 py-2">
                <code className="block truncate text-xs text-ink-400">
                  {entry.detail ? JSON.stringify(entry.detail) : ""}
                </code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {entries.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-400">
          {t("common.none")}
        </p>
      )}
    </div>
  );
}
