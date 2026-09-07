"use client";

import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { CONTROL_READY, createControlBrowserClient } from "@/lib/control/browser";
import type { TranslationKey } from "@/lib/i18n/dictionary";

/**
 * The platform's takedown path, as distinct from the per-file report feature
 * inside a department.
 *
 * Deliberately requires no account. The person who needs this is a stranger
 * who has just been shown something about themselves, and asking them to
 * register with the platform they are complaining about is asking them not to
 * bother.
 *
 * The submission is an anonymous RPC rather than a table insert. `abuse_reports`
 * used to carry an open `with check (true)` insert policy for `anon`, which is
 * an unauthenticated write endpoint -- bounded in how big each row could be
 * and not at all in how many there could be. report_department() is
 * `security definer`, checks that the slug is a department that actually
 * exists, and stops a single archive's queue growing past the point where it
 * still tells whoever reads it anything.
 */
const REASONS: Array<{ value: string; key: TranslationKey }> = [
  { value: "illegal", key: "abuse.reason.illegal" },
  { value: "personal", key: "abuse.reason.personal" },
  { value: "harassment", key: "abuse.reason.harassment" },
  { value: "sexual", key: "abuse.reason.sexual" },
  { value: "impersonation", key: "abuse.reason.impersonation" },
  { value: "copyright", key: "abuse.reason.copyright" },
  { value: "other", key: "abuse.reason.other" },
];

export function ReportForm({ presetSlug }: { presetSlug?: string }) {
  const { t } = useI18n();

  const [slug, setSlug] = useState(presetSlug ?? "");
  const [reason, setReason] = useState(REASONS[0].value);
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = slug.trim().toLowerCase().replace(/^.*\/d\//, "").split("/")[0];
    if (!clean) return setError(t("abuse.slugRequired"));

    setBusy(true);
    setError(null);

    const { error: rpcError } = await createControlBrowserClient().rpc(
      "report_department",
      {
        want_slug: clean,
        why: reason,
        detail: details.trim() || null,
        contact: contact.trim() || null,
      }
    );

    setBusy(false);

    if (rpcError) {
      setError(
        rpcError.message.includes("NO_SUCH_DEPARTMENT")
          ? t("abuse.unknownSlug")
          : t("common.error")
      );
      return;
    }

    // Deliberately the same outcome whether the report was filed, was a
    // duplicate, or landed on a department whose queue is already full: none
    // of those are things an anonymous caller should be able to tell apart.
    setSent(true);
  }

  if (!CONTROL_READY) {
    return <p className="text-sm text-ink-500">{t("setup.noControlPlane")}</p>;
  }

  if (sent) {
    return (
      <div className="paper p-6">
        <p className="stamp stamp-green mb-4 block w-fit text-sm">
          {t("abuse.sent")}
        </p>
        <p className="text-sm leading-relaxed text-ink-700">
          {t("abuse.sentBody")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="paper flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <label className="label" htmlFor="report-slug">
          {t("abuse.which")}
        </label>
        <input
          id="report-slug"
          className="field typewriter"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="the-lorenzo-files"
          spellCheck={false}
          required
        />
        <p className="mt-1 text-xs text-ink-500">{t("abuse.whichHelp")}</p>
      </div>

      <div>
        <label className="label" htmlFor="report-reason">
          {t("abuse.reason")}
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
          {t("abuse.details")}
        </label>
        <textarea
          id="report-details"
          className="field min-h-28 resize-y"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={4000}
          placeholder={t("abuse.detailsPlaceholder")}
        />
      </div>

      <div>
        <label className="label" htmlFor="report-contact">
          {t("abuse.contact")}
        </label>
        <input
          id="report-contact"
          type="email"
          className="field"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="name@example.com"
        />
        <p className="mt-1 text-xs text-ink-500">{t("abuse.contactHelp")}</p>
      </div>

      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="btn btn-primary self-start"
      >
        {busy && <Spinner />}
        {busy ? t("common.loading") : t("abuse.submit")}
      </button>
    </form>
  );
}
