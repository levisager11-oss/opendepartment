"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { createControlBrowserClient } from "@/lib/control/browser";

/**
 * Inline sign-in for the last step of the wizard.
 *
 * Registering a slug needs an owner to attach it to, but nothing before that
 * point does -- so the account is asked for here rather than at the front
 * door, and the wizard's state survives because the page never navigates away.
 *
 * The same panel backs /account/login, where the visitor already has an
 * account -- hence initialMode. Defaulting it to "signup" there would greet a
 * returning owner with a registration form whose submit button is held
 * disabled by a terms box they have already accepted once.
 */
export function ControlAuthPanel({
  onSignedIn,
  initialMode = "signup",
}: {
  onSignedIn: () => void;
  initialMode?: "signin" | "signup";
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Say why nothing is happening. A silently inert submit button is
    // indistinguishable from a broken one.
    if (mode === "signup" && !accepted) {
      setError(t("account.acceptRequired"));
      return;
    }
    setBusy(true);
    setError(null);

    const supabase = createControlBrowserClient();
    const creds = { email: email.trim(), password };

    const { data, error: authError } =
      mode === "signup"
        ? await supabase.auth.signUp(creds)
        : await supabase.auth.signInWithPassword(creds);

    setBusy(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // Sign-up with e-mail confirmation on returns a user but no session.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }

    onSignedIn();
  }

  if (checkEmail) {
    return (
      <div className="border border-gov-700 bg-gov-100/40 p-4 text-sm text-ink-900">
        {t("auth.checkEmail")}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 border border-paper-400 bg-paper-100 p-4"
    >
      <p className="text-sm font-semibold text-ink-900">
        {t("account.signIn")}
      </p>
      <p className="text-xs leading-relaxed text-ink-500">
        {t("account.signInBody")}
      </p>

      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("auth.email")}
        className="field"
      />
      <input
        type="password"
        required
        minLength={8}
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t("auth.password")}
        className="field"
      />

      {/* Registering a department means taking responsibility for what other
          people put in it. Worth one deliberate click. */}
      {mode === "signup" && (
        <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-ink-700">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 accent-gov-800"
          />
          <span>
            {t("account.acceptPre")}{" "}
            <Link
              href="/legal/terms"
              target="_blank"
              rel="noopener"
              className="text-gov-800 underline underline-offset-2"
            >
              {t("legal.terms")}
            </Link>{" "}
            {t("common.and")}{" "}
            <Link
              href="/legal/privacy"
              target="_blank"
              rel="noopener"
              className="text-gov-800 underline underline-offset-2"
            >
              {t("legal.privacy")}
            </Link>
            {t("account.acceptPost")}
          </span>
        </label>
      )}

      {error && <p className="text-xs text-stamp-red">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary"
        >
          {mode === "signup" ? t("auth.signup") : t("auth.signin")}
        </button>
        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="py-1.5 text-xs text-ink-500 underline sm:py-0"
        >
          {mode === "signup" ? t("auth.toSignin") : t("auth.toSignup")}
        </button>
      </div>
    </form>
  );
}
