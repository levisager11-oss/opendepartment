"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { createControlBrowserClient } from "@/lib/control/browser";

type Report = {
  id: string;
  slug: string;
  reporter_email: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  department_status: string | null;
};

const STATUSES = ["open", "resolved", "dismissed"] as const;

/**
 * The platform's takedown queue, for whoever has to read it.
 *
 * report_department() has been writing complaints since it was written and
 * nothing ever read them back -- so the cap, the deduplication and the
 * deliberate "returns quietly" were all in service of a queue whose only
 * reader was somebody remembering to open the Supabase dashboard.
 *
 * Everything here goes through `security definer` functions that re-check
 * is_staff() in the database. This component holds no authority of its own:
 * rendering it for the wrong person shows them an error from Postgres, not a
 * list of complaints, because `abuse_reports` has RLS on with no policy and is
 * unreadable to every role.
 *
 * Suspension is on this screen rather than a separate one because it is the
 * only action a report can actually lead to. It stops the slug resolving and
 * touches nothing in the department's own database -- OpenDepartment holds no
 * key to that, which is the point of the whole architecture and worth saying
 * on the screen where somebody is deciding what to do about a complaint.
 */
export function StaffReports() {
  const { t, formatDate } = useI18n();
  const supabase = createControlBrowserClient();

  const [status, setStatus] = useState<string>("open");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: rpcError } = await supabase.rpc("staff_list_reports", {
      want_status: status,
    });
    if (rpcError) setError(true);
    else setReports((data ?? []) as Report[]);
    setLoading(false);
  }, [supabase, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function close(id: string, next: string) {
    setBusyId(id);
    setActionError(null);
    const { error: rpcError } = await supabase.rpc("staff_resolve_report", {
      target: id,
      new_status: next,
    });
    setBusyId(null);
    if (rpcError) {
      setActionError(t("common.actionFailed"));
      return;
    }
    await load();
  }

  async function setDepartment(slug: string, next: string, note: string | null) {
    setBusyId(slug);
    setActionError(null);
    const { error: rpcError } = await supabase.rpc(
      "staff_set_department_status",
      { want_slug: slug, new_status: next, note }
    );
    setBusyId(null);
    if (rpcError) {
      setActionError(t("common.actionFailed"));
      return;
    }
    await load();
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-xl font-black text-ink-900">
          {t("staff.title")}
        </h2>
        <label className="label sr-only" htmlFor="staff-status">
          {t("staff.filter")}
        </label>
        <select
          id="staff-status"
          className="field w-auto sm:ml-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`staff.status.${value}` as `staff.status.open`)}
            </option>
          ))}
        </select>
      </div>

      {actionError && (
        <p role="alert" className="notice notice-error mb-3">
          {actionError}
        </p>
      )}

      {loading ? (
        <p className="paper p-6 text-sm text-ink-500">{t("common.loading")}</p>
      ) : error ? (
        <p role="alert" className="notice notice-error">
          {t("common.error")}
        </p>
      ) : reports.length === 0 ? (
        <p className="paper p-6 text-sm text-ink-400">{t("staff.none")}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => (
            <li key={report.id} className="paper p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="typewriter text-sm font-bold text-ink-900">
                  /d/{report.slug}
                </span>
                <span className="docket text-2xs text-stamp-red">
                  {report.reason}
                </span>
                {report.department_status === "suspended" && (
                  <span className="stamp stamp-red stamp-sm">
                    {t("staff.suspended")}
                  </span>
                )}
                {report.department_status === null && (
                  <span className="docket text-2xs text-ink-400">
                    {t("staff.gone")}
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-400">
                  {formatDate(report.created_at)}
                </span>
              </div>

              {report.details && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">
                  {report.details}
                </p>
              )}
              {report.reporter_email && (
                <p className="typewriter mt-2 text-xs break-all text-ink-500">
                  {report.reporter_email}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {report.status === "open" && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={busyId === report.id}
                      onClick={() => close(report.id, "resolved")}
                    >
                      {busyId === report.id && <Spinner />}
                      {t("staff.resolve")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={busyId === report.id}
                      onClick={() => close(report.id, "dismissed")}
                    >
                      {t("staff.dismiss")}
                    </button>
                  </>
                )}
                {report.department_status === "active" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost-danger"
                    disabled={busyId === report.slug}
                    onClick={() =>
                      setDepartment(report.slug, "suspended", report.reason)
                    }
                  >
                    {t("staff.suspend")}
                  </button>
                )}
                {report.department_status === "suspended" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={busyId === report.slug}
                    onClick={() => setDepartment(report.slug, "active", null)}
                  >
                    {t("staff.unsuspend")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-ink-400">{t("staff.scope")}</p>
    </section>
  );
}
