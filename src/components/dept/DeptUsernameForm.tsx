"use client";

import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";

export function DeptUsernameForm() {
  const { t } = useI18n();
  const { href } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^[A-Za-z0-9_-]{3,20}$/.test(name.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) {
      setError(t("onboarding.invalid"));
      return;
    }

    setBusy(true);
    setError(null);

    // Validation and the uniqueness check both happen inside the database
    // function, so two people racing for the same name cannot both win.
    const { error } = await supabase.rpc("claim_username", {
      desired: name.trim(),
    });

    if (error) {
      const m = error.message.toUpperCase();
      setError(
        m.includes("TAKEN")
          ? t("onboarding.taken")
          : m.includes("INVALID")
            ? t("onboarding.invalid")
            : t("common.error")
      );
      setBusy(false);
      return;
    }

    router.push(href("vault"));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="username">
          {t("onboarding.label")}
        </label>
        <input
          id="username"
          className="field typewriter text-lg"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("onboarding.placeholder")}
          maxLength={20}
          autoFocus
          autoComplete="off"
        />
        <p className="mt-2 text-xs text-ink-400">{t("onboarding.rules")}</p>
      </div>

      {error && (
        <p
          role="alert"
          className="notice notice-error"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !valid}
        aria-busy={busy}
        className="btn btn-primary"
      >
        {busy && <Spinner />}
        {busy ? t("common.saving") : t("onboarding.submit")}
      </button>
    </form>
  );
}
