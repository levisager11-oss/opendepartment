"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";

/**
 * The second half of "forgot your password".
 *
 * The reset e-mail lands on /d/<slug>/auth/callback, which exchanges the code
 * for a session and forwards here. That session is a real one -- which is
 * exactly why this screen has to exist: without it a reset link signs somebody
 * in and then leaves the old password in place, so the feature reads as a
 * magic link and the password never actually changes.
 *
 * updateUser() acts on whoever the session says you are, so there is no
 * user id to pass and nothing to forge: the recovery link is the proof.
 */
export function DeptPasswordForm() {
  const { t } = useI18n();
  const { href } = useTenant();
  const supabase = useTenantClient();
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

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      const message = updateError.message.toLowerCase();
      setError(
        message.includes("should be at least")
          ? t("auth.passwordTooShort")
          : t("common.error")
      );
      setBusy(false);
      return;
    }

    setDone(true);
    setBusy(false);

    // The recovery session is a full session, so there is nowhere to send them
    // but in. requireMember() on the way picks up anyone who never chose a
    // cover name and routes them to onboarding.
    router.push(href("vault"));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="new-password">
          {t("auth.newPassword")}
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="label" htmlFor="repeat-password">
          {t("auth.repeatPassword")}
        </label>
        <input
          id="repeat-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="field"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="notice notice-ok">
          {t("auth.updateDone")}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || done}
        aria-busy={busy}
        className="btn btn-primary"
      >
        {busy && <Spinner />}
        {busy ? t("common.saving") : t("auth.updateSubmit")}
      </button>
    </form>
  );
}
