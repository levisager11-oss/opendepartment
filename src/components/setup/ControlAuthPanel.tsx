"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { createControlBrowserClient } from "@/lib/control/browser";
import type { TranslationKey } from "@/lib/i18n/dictionary";

type Mode = "signin" | "signup" | "reset";

/**
 * Supabase's own wording is written for whoever holds the project keys, and it
 * is English in a form that is otherwise bilingual. The ones a person can act
 * on get a sentence of their own; the rest go to the console.
 */
function mapAuthError(message: string): TranslationKey {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "auth.invalidCredentials";
  if (m.includes("email not confirmed")) return "auth.emailNotConfirmed";
  if (m.includes("password should be at least")) return "auth.passwordTooShort";
  if (m.includes("rate limit") || m.includes("too many")) return "auth.rateLimited";
  if (typeof console !== "undefined") console.error("auth:", message);
  return "auth.genericError";
}

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
  linkFailed = false,
}: {
  onSignedIn: () => void;
  initialMode?: "signin" | "signup";
  /** Arrived from /account/auth/callback with a link that could not be used. */
  linkFailed?: boolean;
}) {
  const { t } = useI18n();
  const id = useId();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    linkFailed ? t("account.linkInvalid") : null
  );
  const [info, setInfo] = useState<string | null>(null);
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
    setInfo(null);

    try {
      const supabase = createControlBrowserClient();
      const callback = `${window.location.origin}/account/auth/callback`;

      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${callback}?next=${encodeURIComponent("/account/auth/update-password")}` }
        );
        if (resetError) {
          setError(t(mapAuthError(resetError.message)));
          return;
        }
        // The same answer whether or not the address has an account.
        setInfo(t("account.resetSent"));
        setMode("signin");
        return;
      }

      const creds = { email: email.trim(), password };

      const { data, error: authError } =
        mode === "signup"
          ? await supabase.auth.signUp({
              ...creds,
              options: { emailRedirectTo: `${callback}?next=/account` },
            })
          : await supabase.auth.signInWithPassword(creds);

      setBusy(false);

      if (authError) {
        setError(t(mapAuthError(authError.message)));
        return;
      }

      // Sign-up with e-mail confirmation on returns a user but no session.
      if (!data.session) {
        setCheckEmail(true);
        return;
      }

      onSignedIn();
    } catch {
      setError(t("common.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="border border-gov-700 bg-gov-100/40 p-4 text-sm text-ink-900">
        <p role="status">{t("auth.checkEmail")}</p>
        <button type="button" className="btn btn-primary mt-3" onClick={() => {
          setCheckEmail(false);
          setMode("signin");
          setPassword("");
        }}>{t("auth.toSignin")}</button>
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

      <label className="label" htmlFor={`${id}-email`}>{t("auth.email")}</label>
      <input
        id={`${id}-email`}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t("auth.email")}
        className="field"
      />
      {mode !== "reset" && (
        <>
          <label className="label" htmlFor={`${id}-password`}>{t("auth.password")}</label>
          <input
            id={`${id}-password`}
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.password")}
            className="field"
          />
        </>
      )}

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

      {error && <p role="alert" className="text-xs text-stamp-red">{error}</p>}
      {info && <p role="status" className="notice notice-ok text-xs">{info}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="btn btn-primary"
        >
          {mode === "signup" ? t("auth.signup") : mode === "reset" ? t("auth.reset") : t("auth.signin")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          className="py-1.5 text-xs text-ink-500 underline sm:py-0"
        >
          {mode === "signin" ? t("auth.toSignup") : t("auth.toSignin")}
        </button>
      </div>
      {/* Without this, a forgotten password locked an operator out of the one
          account that can delist or delete their departments. */}
      {mode === "signin" && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setMode("reset");
            setError(null);
            setInfo(null);
          }}
          className="py-1.5 text-xs text-ink-500 underline sm:py-0"
        >
          {t("auth.forgot")}
        </button>
      )}
    </form>
  );
}
