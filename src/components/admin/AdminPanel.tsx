"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { formatBytes } from "@/lib/tenant/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { AdminFiles } from "./AdminFiles";
import { AdminReports } from "./AdminReports";
import { AdminUsers } from "./AdminUsers";
import { AdminInvites } from "./AdminInvites";
import { AdminSubjects } from "./AdminSubjects";
import { AdminAudit } from "./AdminAudit";
import type {
  AdminFile,
  AdminReport,
  AdminSubject,
  AdminUser,
  InviteEntry,
  AuditEntry,
} from "./types";

type Tab =
  | "files"
  | "reports"
  | "users"
  | "invites"
  | "subjects"
  | "audit";

const TABS: Array<{ id: Tab; key: TranslationKey }> = [
  { id: "reports", key: "admin.tab.reports" },
  { id: "files", key: "admin.tab.files" },
  { id: "users", key: "admin.tab.users" },
  { id: "invites", key: "admin.tab.invites" },
  { id: "subjects", key: "admin.tab.subjects" },
  { id: "audit", key: "admin.tab.audit" },
];

/** Supabase free tier gives 1 GB of object storage. */
const STORAGE_QUOTA = 1024 * 1024 * 1024;

export function AdminPanel({
  currentUserId,
  files,
  reports,
  users,
  invites,
  subjects,
  audit,
  totalBytes,
}: {
  currentUserId: string;
  files: AdminFile[];
  reports: AdminReport[];
  users: AdminUser[];
  invites: InviteEntry[];
  subjects: AdminSubject[];
  audit: AuditEntry[];
  totalBytes: number;
}) {
  const { t } = useI18n();
  const openReports = reports.filter((r) => r.status === "open").length;
  const [tab, setTab] = useState<Tab>(openReports > 0 ? "reports" : "files");

  const usedPercent = Math.min(100, (totalBytes / STORAGE_QUOTA) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="docket !text-stamp-red">
            RESTRICTED · CLEARANCE REQUIRED
          </span>
          <h1 className="font-[family-name:var(--font-serif)] text-3xl font-black text-gov-900">
            {t("admin.title")}
          </h1>
          <p className="typewriter mt-1 text-sm text-ink-500">
            {t("admin.subtitle")}
          </p>
        </div>

        {/* storage meter */}
        <div className="paper min-w-64 rounded-xs px-4 py-3">
          <div className="docket mb-2 flex items-baseline justify-between">
            <span>{t("admin.storage")}</span>
            <span className="typewriter !text-xs !normal-case !tracking-normal text-ink-900">
              {formatBytes(totalBytes)}{" "}
              {t("admin.storageOf", { total: "1 GB" })}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper-300">
            <div
              className={`h-full transition-all ${
                usedPercent > 85
                  ? "bg-stamp-red"
                  : usedPercent > 60
                    ? "bg-gold-500"
                    : "bg-stamp-green"
              }`}
              style={{ width: `${Math.max(1, usedPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="scroll-x mb-5 border-b-2 border-paper-400">
        <div className="flex min-w-max gap-1">
          {TABS.map((entry) => {
            const active = tab === entry.id;
            const badge =
              entry.id === "reports" && openReports > 0 ? openReports : null;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={`relative -mb-0.5 cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-gov-800 text-gov-900"
                    : "border-transparent text-ink-500 hover:text-gov-800"
                }`}
              >
                {t(entry.key)}
                {badge && (
                  <span className="ml-2 rounded-full bg-stamp-red px-1.5 py-0.5 text-[0.6rem] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "files" && <AdminFiles files={files} />}
      {tab === "reports" && <AdminReports reports={reports} />}
      {tab === "users" && (
        <AdminUsers users={users} currentUserId={currentUserId} />
      )}
      {tab === "invites" && <AdminInvites invites={invites} />}
      {tab === "subjects" && <AdminSubjects subjects={subjects} />}
      {tab === "audit" && <AdminAudit entries={audit} />}
    </div>
  );
}
