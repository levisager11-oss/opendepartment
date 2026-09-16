"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { formatBytes } from "@/lib/tenant/types";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { AdminFiles } from "./AdminFiles";
import { AdminReports } from "./AdminReports";
import { AdminUsers } from "./AdminUsers";
import { AdminStorage } from "./AdminStorage";
import { AdminInvites } from "./AdminInvites";
import { AdminSubjects } from "./AdminSubjects";
import { AdminAudit } from "./AdminAudit";
import { AdminSettings } from "./AdminSettings";
import { AdminDanger } from "./AdminDanger";
import type {
  AdminFile,
  AdminReport,
  AdminSubject,
  AdminUser,
  DepartmentSettings,
  InviteEntry,
  AuditEntry,
} from "./types";

type Tab =
  | "files"
  | "reports"
  | "users"
  | "invites"
  | "subjects"
  | "settings"
  | "audit";

const TABS: Array<{ id: Tab; key: TranslationKey }> = [
  { id: "reports", key: "admin.tab.reports" },
  { id: "files", key: "admin.tab.files" },
  { id: "users", key: "admin.tab.users" },
  { id: "invites", key: "admin.tab.invites" },
  { id: "subjects", key: "admin.tab.subjects" },
  { id: "settings", key: "admin.tab.settings" },
  { id: "audit", key: "admin.tab.audit" },
];

/** Supabase free tier gives 1 GB of object storage. */
const STORAGE_QUOTA = 1024 * 1024 * 1024;

export function AdminPanel({
  truncated,
  currentUserId,
  files,
  reports,
  users,
  invites,
  subjects,
  settings,
  audit,
  totalBytes,
}: {
  /** Lists that came back at their query limit -- see the admin page. */
  truncated: { files: boolean; reports: boolean; audit: boolean };
  currentUserId: string;
  files: AdminFile[];
  reports: AdminReport[];
  users: AdminUser[];
  invites: InviteEntry[];
  subjects: AdminSubject[];
  settings: DepartmentSettings | null;
  audit: AuditEntry[];
  totalBytes: number;
}) {
  const { t } = useI18n();
  const openReports = reports.filter((r) => r.status === "open").length;
  const [tab, setTab] = useState<Tab>(openReports > 0 ? "reports" : "files");

  const usedPercent = Math.min(100, (totalBytes / STORAGE_QUOTA) * 100);

  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const stripRef = useRef<HTMLDivElement>(null);

  /**
   * Seven tabs do not fit across a phone, so the strip scrolls -- and the tab
   * you just selected could sit entirely outside the visible part of it,
   * leaving the panel below with nothing on screen saying which one it is.
   *
   * Written against the strip's own scrollLeft rather than scrollIntoView.
   * scrollIntoView walks every scrollable ancestor, and "nearest" is no
   * defence: with the page a pixel or two wider than the viewport it took the
   * whole document sideways along with the strip, so selecting a tab shunted
   * the masthead and the heading off the left edge. This can only ever move
   * this one element, and only when the tab really is out of view -- which at
   * a width that fits them all is never.
   */
  useEffect(() => {
    const strip = stripRef.current;
    const button = tabRefs.current[tab];
    if (!strip || !button) return;

    // Measured off bounding rects, not offsetLeft: the buttons are
    // position:relative and the strip is not, so offsetLeft is relative to
    // whatever positioned ancestor happens to be above this component.
    const box = strip.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    if (target.left < box.left) {
      strip.scrollLeft -= box.left - target.left;
    } else if (target.right > box.right) {
      strip.scrollLeft += target.right - box.right;
    }
  }, [tab]);

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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="docket text-stamp-red text-2xs">
            RESTRICTED · CLEARANCE REQUIRED
          </span>
          <h1 className="font-serif text-2xl font-black break-words text-gov-900 sm:text-3xl">
            {t("admin.title")}
          </h1>
          <p className="typewriter mt-1 text-sm text-ink-500">
            {t("admin.subtitle")}
          </p>
        </div>

        {/* storage meter */}
        <div className="paper w-full min-w-64 px-4 py-3 sm:w-auto">
          <div className="docket mb-2 flex flex-wrap items-baseline justify-between gap-x-3 text-2xs text-ink-500">
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
      <div ref={stripRef} className="scroll-x mb-5 border-b-2 border-paper-400">
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
                // arrow keys move between tabs. A separate tab stop per tab
                // would be seven presses to get past the toolbar.
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

      {/* Said once, under the strip, for whichever tab is showing a subset.
          A screen that quietly shows the first 500 of 900 documents is worse
          than one that shows 500 and says so. */}
      {(tab === "files" || tab === "reports" || tab === "audit") &&
        truncated[tab] && (
          <p className="notice mb-4 text-xs">{t("admin.truncated")}</p>
        )}

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
        {/* settings is a single row that every department has; null only ever
            means the read was refused, and an empty form would invite an
            administrator to overwrite the real values with blanks. */}
        {tab === "settings" &&
          (settings ? (
            <div className="flex flex-col gap-4">
              <AdminSettings settings={settings} />
              {/* Below the form rather than beside it: this one reads live
                  from the project instead of from the page's own props, so it
                  loads on its own and must not hold the form up. */}
              <AdminStorage />
              {/* Last on the screen, under everything it would destroy. */}
              <AdminDanger departmentName={settings.department_name} />
            </div>
          ) : (
            <p className="paper px-6 py-14 text-center text-sm text-ink-500">
              {t("common.error")}
            </p>
          ))}
        {tab === "audit" && <AdminAudit entries={audit} />}
      </div>
    </div>
  );
}
