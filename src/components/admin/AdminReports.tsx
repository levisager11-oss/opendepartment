"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { STORAGE_BUCKET } from "@/lib/tenant/types";
import type { AdminReport } from "./types";

const REASON_KEYS: Record<string, TranslationKey> = {
  illegal: "report.reason.illegal",
  personal: "report.reason.personal",
  copyright: "report.reason.copyright",
  sexual: "report.reason.sexual",
  harassment: "report.reason.harassment",
  other: "report.reason.other",
};

export function AdminReports({ reports }: { reports: AdminReport[] }) {
  const { t, formatDate } = useI18n();
  const { href } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();
  const [showResolved, setShowResolved] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = reports.filter((r) =>
    showResolved ? true : r.status === "open"
  );

  async function setStatus(id: string, status: "resolved" | "dismissed") {
    setBusyId(id);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("reports")
      .update({
        status,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id ?? null,
      })
      .eq("id", id);

    setBusyId(null);
    router.refresh();
  }

  async function destroyFile(report: AdminReport) {
    if (!report.file_id) return;
    if (!confirm(t("file.deleteConfirm"))) return;

    setBusyId(report.id);

    // delete_file() re-checks admin-or-owner inside the tenant's database and
    // returns the storage path, so no service-role key is involved.
    const { data: path, error } = await supabase.rpc("delete_file", {
      target: report.file_id,
      why: `report:${report.id}`,
    });

    if (error) {
      setBusyId(null);
      alert(t("common.error"));
      return;
    }

    if (typeof path === "string" && path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    }

    await setStatus(report.id, "resolved");
  }

  return (
    <div>
      <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={showResolved}
          onChange={(e) => setShowResolved(e.target.checked)}
          className="accent-gov-800"
        />
        {t("admin.tab.reports")} — {t("vault.filter.all")}
      </label>

      {visible.length === 0 ? (
        <div className="paper py-14 text-center">
          <span className="stamp stamp-green text-sm">ALL CLEAR</span>
          <p className="mt-5 text-sm text-ink-500">{t("admin.reports.none")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((report) => (
            <li
              key={report.id}
              className={`paper p-4 ${
                report.status === "open"
                  ? "paper-flag-red"
                  : "paper-flag-muted opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="stamp stamp-red stamp-sm">
                      {t(REASON_KEYS[report.reason] ?? "report.reason.other")}
                    </span>
                    <span className="docket text-3xs text-ink-500">
                      {formatDate(report.created_at)}
                    </span>
                    {report.status !== "open" && (
                      <span className="docket text-3xs text-stamp-green">
                        {report.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {report.file_id ? (
                    <Link
                      href={href(`file/${report.file_id}`)}
                      className="font-serif font-bold text-gov-800 hover:underline"
                    >
                      {report.file_title ?? report.file_id}
                    </Link>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}

                  {report.details && (
                    <p className="mt-2 max-w-prose text-sm leading-relaxed whitespace-pre-wrap text-ink-700">
                      {report.details}
                    </p>
                  )}

                  <p className="docket mt-2 text-3xs text-ink-500">
                    {t("admin.reports.reportedBy")}:{" "}
                    <span className="typewriter normal-case">
                      {report.reporter_username ?? "—"}
                    </span>
                  </p>
                </div>

                {report.status === "open" && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => destroyFile(report)}
                      disabled={busyId === report.id || !report.file_id}
                      className="btn btn-sm btn-danger"
                    >
                      {t("admin.reports.deleteFile")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(report.id, "resolved")}
                      disabled={busyId === report.id}
                      className="btn btn-sm btn-ghost"
                    >
                      {t("admin.reports.resolve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(report.id, "dismissed")}
                      disabled={busyId === report.id}
                      className="btn btn-sm btn-ghost"
                    >
                      {t("admin.reports.dismiss")}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
