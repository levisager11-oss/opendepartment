"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { CONTROL_READY, createControlBrowserClient } from "@/lib/control/browser";
import { useI18n } from "@/lib/i18n/provider";

const STORAGE = ["under_1gb", "1_10gb", "10_100gb", "over_100gb"] as const;
const ERRORS = ["INVALID_EMAIL", "INVALID_GROUP_SIZE", "INVALID_STORAGE", "INVALID_PRICE", "RATE_LIMITED", "WAITLIST_FULL"] as const;

export function WaitlistSection() {
  const { t } = useI18n();
  if (!CONTROL_READY) return null;

  return (
    <section id="waitlist" className="mx-auto max-w-3xl space-y-5 px-4 py-12">
      <h2 className="font-display text-2xl font-bold text-ink-900">
        {t("waitlist.heading")}
      </h2>
      <p className="text-ink-700">{t("waitlist.intro")}</p>
      <WaitlistForm />
    </section>
  );
}

export function WaitlistForm() {
  const { t } = useI18n();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const { error: rpcError } = await createControlBrowserClient().rpc("join_waitlist", {
        email: String(data.get("email")).trim().toLowerCase(),
        group_size: Number(data.get("group_size")),
        expected_storage: String(data.get("expected_storage")),
        willingness_to_pay: Number(data.get("willingness_to_pay")),
      });
      if (rpcError) {
        const named = ERRORS.find((name) => rpcError.message.includes(name));
        setError(named ? t(`waitlist.${named}`) : t("common.error"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  if (!CONTROL_READY) return null;
  if (sent) return <p role="status" className="notice">{t("waitlist.success")}</p>;

  return (
    <form onSubmit={submit} className="paper flex flex-col gap-4 p-5 sm:p-6">
      <div>
        <label className="label" htmlFor={`${id}-email`}>{t("waitlist.email")}</label>
        <input id={`${id}-email`} name="email" className="field" type="email" required maxLength={254} autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-group`}>{t("waitlist.groupSize")}</label>
        <input id={`${id}-group`} name="group_size" className="field" type="number" min={1} max={10000} required />
      </div>
      <div>
        <label className="label" htmlFor={`${id}-storage`}>{t("waitlist.storage")}</label>
        <select id={`${id}-storage`} name="expected_storage" className="field" required>
          {STORAGE.map((bucket) => <option key={bucket} value={bucket}>{t(`waitlist.${bucket}`)}</option>)}
        </select>
      </div>
      <fieldset className="space-y-2">
        <legend className="label">{t("waitlist.price")}</legend>
        {([0, 3, 5, 10] as const).map((price) => (
          <label key={price} className="flex items-center gap-2 text-sm text-ink-700">
            <input type="radio" name="willingness_to_pay" value={price} required />
            {t(`waitlist.price${price}`)}
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-ink-500"><Link href="/legal/privacy" className="underline">{t("waitlist.privacy")}</Link></p>
      {error && <p role="alert" className="notice notice-error">{error}</p>}
      <button type="submit" disabled={busy} aria-busy={busy} className="btn btn-primary self-start">
        {busy && <Spinner />}
        {busy ? t("common.loading") : t("waitlist.submit")}
      </button>
    </form>
  );
}
