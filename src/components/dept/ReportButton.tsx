"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useTenantClient } from "@/lib/tenant/context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

const REASONS: Array<{ value: string; key: TranslationKey }> = [
  { value: "illegal", key: "report.reason.illegal" },
  { value: "personal", key: "report.reason.personal" },
  { value: "copyright", key: "report.reason.copyright" },
  { value: "sexual", key: "report.reason.sexual" },
  { value: "harassment", key: "report.reason.harassment" },
  { value: "other", key: "report.reason.other" },
];

/**
 * Notice-and-takedown, from the reader's side. Every report lands in the admin
 * queue with a timestamp, which is what makes "removed as soon as the operator
 * becomes aware" something you can actually evidence.
 */
export function ReportButton({ fileId }: { fileId: string }) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = useTenantClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(t("common.error"));
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase.from("reports").insert({
      file_id: fileId,
      reporter_id: user.id,
      reason,
      details: details.trim() || null,
    });

    if (insertError) {
      setError(
        /duplicate/i.test(insertError.message)
          ? t("report.alreadySent")
          : t("common.error")
      );
      setBusy(false);
      return;
    }

    setDone(true);
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 21V4h9l1 2h5v9h-6l-1-2H5" strokeLinejoin="round" />
        </svg>
        {t("file.report")}
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="paper m-auto w-[min(92vw,32rem)] rounded-xs p-0 backdrop:bg-ink-900/60"
      >
        <div className="p-6">
          <p className="docket mb-1 !text-stamp-red">{t("report.title")}</p>

          {done ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-ink-700">
                {t("report.sent")}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn btn-primary mt-6"
              >
                {t("common.close")}
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed text-ink-700">
                {t("report.body")}
              </p>

              <div>
                <label className="label" htmlFor="report-reason">
                  {t("report.reason")}
                </label>
                <select
                  id="report-reason"
                  className="field"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.key)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="report-details">
                  {t("report.details")}
                </label>
                <textarea
                  id="report-details"
                  className="field min-h-24 resize-y"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={1000}
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-stamp-red">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn btn-ghost"
                >
                  {t("common.cancel")}
                </button>
                <button type="submit" disabled={busy} className="btn btn-danger">
                  {busy ? t("common.saving") : t("report.submit")}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
