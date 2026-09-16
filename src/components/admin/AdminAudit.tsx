"use client";

import { useCallback } from "react";
import { useI18n } from "@/lib/i18n/provider";
import type { AuditEntry } from "./types";

/**
 * One CSV field.
 *
 * Everything is quoted rather than only the fields that need it. An action
 * name or a JSON detail can carry a comma, a quote or a newline, and a
 * spreadsheet reading a half-quoted file silently shifts every column after
 * the offending row -- which, in the one record of who deleted what, is the
 * kind of wrong that looks right.
 *
 * The leading apostrophe guards against formula injection: a field starting
 * `=`, `+`, `-` or `@` is executed by Excel and Sheets on open, and these
 * fields carry usernames somebody else chose.
 */
function csvField(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function AdminAudit({ entries }: { entries: AuditEntry[] }) {
  const { t, formatDate } = useI18n();

  /**
   * The log, as a file.
   *
   * This is the department's record of who deleted what and who banned whom,
   * and until now the only way to keep any of it was a screenshot -- the
   * screen shows the most recent hundred rows and purge_department() empties
   * the table. An export is what makes it an audit trail rather than a recent
   * activity feed.
   *
   * Exports what is on screen, which is what the administrator can see; the
   * notice above the tab says when that is a subset.
   */
  const download = useCallback(() => {
    const header = ["when", "action", "actor", "target", "detail"];
    const rows = entries.map((entry) => [
      entry.created_at,
      entry.action,
      entry.actor_username ?? "",
      entry.target ?? "",
      entry.detail ? JSON.stringify(entry.detail) : "",
    ]);
    // A BOM, so Excel opens UTF-8 as UTF-8 rather than as the local codepage.
    const csv =
      "\ufeff" +
      [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n");
    const href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = href;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(href);
  }, [entries]);

  return (
    <div className="paper">
      {entries.length > 0 && (
        <div className="flex justify-end border-b border-paper-300 px-3 py-2">
          <button type="button" onClick={download} className="btn btn-sm btn-ghost">
            {t("admin.audit.export")}
          </button>
        </div>
      )}
      <div className="scroll-x">
      <table className="w-full min-w-2xl text-sm">
        <thead>
          <tr className="border-b border-paper-300 text-left">
            {[
              t("admin.audit.when"),
              t("admin.audit.action"),
              t("admin.audit.actor"),
              "",
            ].map((label, i) => (
              <th key={i} className="docket px-3 py-2 text-3xs text-ink-500">
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
      </div>

      {entries.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-400">
          {t("common.none")}
        </p>
      )}
    </div>
  );
}
