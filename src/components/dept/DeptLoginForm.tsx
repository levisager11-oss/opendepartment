"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Spinner } from "@/components/Spinner";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import type { TranslationKey } from "@/lib/i18n/dictionary";

type Mode = "signin" | "signup" | "reset";

/**
 * Who may join is decided by a trigger on auth.users inside the tenant's own
 * database -- a public department admits anybody, a closed one wants a code --
 * so a refusal arrives at sign-up time as a generic Postgres error. We
 * translate it here rather than exposing an endpoint that would let anyone
 * probe which codes are valid.
 *
 * Note there is no "Continue with Google" button. OAuth is per-project
 * configuration: every department owner would have to register their own
 * Google app and paste the client secret into their Supabase project. E-mail
 * and password works the moment the schema is installed.
 */
function mapAuthError(
  message: string,
  t: (k: TranslationKey) => string,
  sentCode: boolean
): string {
  const m = message.toLowerCase();

  if (m.includes("dept_no_invite")) return t("invite.required");
  if (m.includes("dept_bad_invite")) return t("invite.invalid");
  if (m.includes("dept_invite_expired")) return t("invite.expired");
  if (m.includes("dept_invite_used")) return t("invite.used");

  // Supabase collapses a trigger exception into this when it cannot see the
  // detail. A bad code is by far the likeliest cause when one was typed --
  // but blaming the code when the form did not send one just sends people
  // hunting for a code they were never asked for.
  if (m.includes("database error")) {
    return sentCode ? t("invite.invalid") : t("auth.genericError");
  }

  if (m.includes("invalid login credentials")) return t("auth.invalidCredentials");
  if (m.includes("password should be at least")) return t("auth.passwordTooShort");
  return message;
}

export function DeptLoginForm({
  initialMode = "signin",
  presetInvite,
}: {
  initialMode?: Mode;
  presetInvite?: string;
}) {
  const { t } = useI18n();
  const { href, slug, branding } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();
  const params = useSearchParams();

  // Same rule as the auth callback: inside this department, or nowhere. A
  // bare prefix test would also let /d/<slug>-other through.
  const nextParam = params.get("next");
  const next =
    nextParam &&
    (nextParam === `/d/${slug}` || nextParam.startsWith(`/d/${slug}/`))
      ? nextParam
      : href("vault");

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invite, setInvite] = useState(presetInvite ?? "");
  // Shown up front unless the department is public: there, it is one line of
  // reassurance for the person who does have a code, not a barrier.
  const [showInvite, setShowInvite] = useState(
    Boolean(presetInvite) || !branding.openJoin
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const callback = `${origin}/d/${slug}/auth/callback?next=${encodeURIComponent(next)}`;


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "reset") {
        await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${origin}/d/${slug}/auth/callback?next=${encodeURIComponent(
            href("auth/update-password")
          )}`,
        });
        // Deliberately always the same message: never reveal who is a member.
        setInfo(t("auth.resetSent"));
        setMode("signin");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: callback,
            // Read by handle_new_user() out of raw_user_meta_data. Sending it
            // as metadata is what lets the trigger check the code in the same
            // transaction that creates the user.
            data: invite.trim() ? { invite_code: invite.trim().toUpperCase() } : {},
          },
        });
        if (error) throw error;

        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setInfo(t("auth.checkEmail"));
        }
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("auth.genericError");
      setError(mapAuthError(message, t, Boolean(invite.trim())));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="email">
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>

        {mode !== "reset" && (
          <div>
            <label className="label" htmlFor="password">
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        )}

        {/* A public department asks for nothing but an address and a
            password. The code field is still reachable, because a code is the
            only way to arrive as an administrator -- it just stops being the
            first thing a newcomer is confronted with. */}
        {mode === "signup" && !showInvite && (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="cursor-pointer self-start text-xs text-gov-800 underline underline-offset-2 hover:text-gov-600"
          >
            {t("dept.haveInvite")}
          </button>
        )}

        {mode === "signup" && showInvite && (
          <div>
            <label className="label" htmlFor="invite">
              {t(branding.openJoin ? "invite.codeOptional" : "invite.code")}
            </label>
            <input
              id="invite"
              className="field typewriter"
              value={invite}
              onChange={(e) => setInvite(e.target.value.toUpperCase())}
              placeholder={t("invite.codePlaceholder")}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-ink-400">
              {t(branding.openJoin ? "dept.openJoinNote" : "dept.needInvite")}
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="notice notice-error"
          >
            {error}
          </p>
        )}
        {info && (
          <p
            role="status"
            className="notice notice-ok"
          >
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="btn btn-primary"
        >
          {busy && <Spinner />}
          {busy
            ? t("auth.working")
            : mode === "signup"
              ? t("auth.signup")
              : mode === "reset"
                ? t("auth.reset")
                : t("auth.signin")}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
            setInfo(null);
          }}
          className="cursor-pointer py-1.5 text-gov-800 underline underline-offset-2 hover:text-gov-600 sm:py-0"
        >
          {mode === "signup" ? t("auth.toSignin") : t("auth.toSignup")}
        </button>

        {mode !== "reset" && (
          <button
            type="button"
            onClick={() => {
              setMode("reset");
              setError(null);
              setInfo(null);
            }}
            className="cursor-pointer py-1.5 text-ink-500 underline underline-offset-2 hover:text-ink-700 sm:py-0"
          >
            {t("auth.forgot")}
          </button>
        )}
      </div>
    </div>
  );
}
