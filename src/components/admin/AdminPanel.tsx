"use client";

import { useRef, useState } from "react";
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

  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});

  /**
   * Arrow-key movement across the tab strip, per the WAI-ARIA tabs pattern.
   * Selection follows focus, which is the right call here because switching
   * tabs only swaps already-loaded data -- no fetch is triggered by moving.
   */
  function onTabKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const delta =
      e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;

    let next: Tab | null = null;
    if (delta !== 0) {
      const i = TABS.findIndex((entry) => entry.id === tab);
      next = TABS[(i + delta + TABS.length) % TABS.length].id;
    } else if (e.key === "Home") {
      next = TABS[0].id;
    } else if (e.key === "End") {
      next = TABS[TABS.length - 1].id;
    }

    if (!next) return;
    e.preventDefault();
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="docket text-stamp-red text-2xs">
            RESTRICTED · CLEARANCE REQUIRED
          </span>
          <h1 className="font-serif text-3xl font-black text-gov-900">
            {t("admin.title")}
          </h1>
          <p className="typewriter mt-1 text-sm text-ink-500">
            {t("admin.subtitle")}
          </p>
        </div>

        {/* storage meter */}
        <div className="paper min-w-64 px-4 py-3">
          <div className="docket mb-2 flex items-baseline justify-between text-2xs text-ink-500">
            <span>{t("admin.storage")}</span>
            <span className="typewriter text-xs normal-case tracking-normal text-ink-900">
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
        <div
          role="tablist"
          aria-label={t("admin.title")}
          className="flex min-w-max gap-1"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((entry) => {
            const active = tab === entry.id;
            const badge =
              entry.id === "reports" && openReports > 0 ? openReports : null;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`admin-tab-${entry.id}`}
                aria-selected={active}
                aria-controls={`admin-panel-${entry.id}`}
                // Roving tabindex: one Tab press enters the strip, then the
                // arrow keys move between tabs. Six separate tab stops would
                // be six presses to get past the toolbar.
                tabIndex={active ? 0 : -1}
                ref={(node) => {
                  tabRefs.current[entry.id] = node;
                }}
                onClick={() => setTab(entry.id)}
                className={`relative -mb-0.5 cursor-pointer border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-gov-800 text-gov-900"
                    : "border-transparent text-ink-500 hover:text-gov-800"
                }`}
              >
                {t(entry.key)}
                {badge && (
                  <span className="ml-2 rounded-full bg-stamp-red px-1.5 py-0.5 text-3xs font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`admin-panel-${tab}`}
        aria-labelledby={`admin-tab-${tab}`}
        tabIndex={0}
      >
        {tab === "files" && <AdminFiles files={files} />}
        {tab === "reports" && <AdminReports reports={reports} />}
        {tab === "users" && (
          <AdminUsers users={users} currentUserId={currentUserId} />
        )}
        {tab === "invites" && <AdminInvites invites={invites} />}
        {tab === "subjects" && <AdminSubjects subjects={subjects} />}
        {tab === "audit" && <AdminAudit entries={audit} />}
      </div>
    </div>
  );
}
