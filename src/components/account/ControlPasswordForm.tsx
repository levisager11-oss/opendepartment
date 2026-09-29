"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { createControlBrowserClient } from "@/lib/control/browser";

/**
 * The second half of an operator's "forgot your password". updateUser() acts
 * on whoever the recovery session says you are -- the link is the proof, and
 * there is no user id here to forge. DeptPasswordForm is the same screen for a
 * department membership, against that department's own project.
 */
export function ControlPasswordForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError(t("auth.passwordTooShort"));
    if (password !== repeat) return setError(t("auth.passwordMismatch"));

    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await createControlBrowserClient().auth.updateUser({ password });
      if (updateError) {
        setError(
          updateError.message.toLowerCase().includes("should be at least")
            ? t("auth.passwordTooShort")
            : t("common.error")
        );
        return;
      }
      setDone(true);
      router.push("/account");
      router.refresh();
    } catch {
      setError(t("common.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="control-new-password">
          {t("auth.newPassword")}
        </label>
        <input
          id="control-new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="control-repeat-password">
          {t("auth.repeatPassword")}
        </label>
        <input
          id="control-repeat-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </div>

      {error && <p role="alert" className="notice notice-error">{error}</p>}
      {done && <p role="status" className="notice notice-ok">{t("auth.updateDone")}</p>}

      <button type="submit" disabled={busy || done} aria-busy={busy} className="btn btn-primary">
        {busy && <Spinner />}
        {busy ? t("common.saving") : t("auth.updateSubmit")}
      </button>
    </form>
  );
}
