"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { Spinner } from "@/components/Spinner";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { safeLocalPath } from "@/lib/navigation";
import { forgetBootstrapSecret, isBootstrapSecret, loadBootstrapSecret, saveBootstrapSecret } from "@/lib/setup/bootstrap";

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

  if (m.includes("dept_bad_bootstrap")) return t("auth.bootstrapInvalid");
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

  // Anything unrecognised used to be printed as it arrived. Supabase's own
  // wording is written for whoever is holding the keys, not for somebody
  // trying to join an archive: it names internals, it is untranslated in a
  // form that is otherwise bilingual, and on a signup refusal it can describe
  // the department's configuration to a person who is not in it yet. The
  // original still reaches the console, where it is useful.
  if (typeof console !== "undefined") console.error("auth:", message);
  return t("auth.genericError");
}

export function DeptLoginForm({
  initialMode = "signin",
  presetInvite,
}: {
  initialMode?: Mode;
  presetInvite?: string;
}) {
  const { t } = useI18n();
  const { href, slug, branding, supabaseUrl } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();
  const params = useSearchParams();

  // Same rule as the auth callback: inside this department, or nowhere. A
  // bare prefix test would also let /d/<slug>-other through.
  const nextParam = params.get("next");
  const next = safeLocalPath(nextParam, href("vault"), `/d/${slug}`);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [reveal, setReveal] = useState(false);
  const [invite, setInvite] = useState(presetInvite ?? "");
  // Shown up front unless the department is public: there, it is one line of
  // reassurance for the person who does have a code, not a barrier.
  const [showInvite, setShowInvite] = useState(
    Boolean(presetInvite) || !branding.openJoin
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("error") === "auth" ? t("auth.linkInvalid") : null
  );
  const [info, setInfo] = useState<string | null>(null);
  const [bootstrapSecret, setBootstrapSecret] = useState<string | null>(null);

  useEffect(() => {
    function readFounderLink() {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      if (fragment.has("bootstrap")) {
        const secret = fragment.get("bootstrap");
        // Fragments never reach the server. Remove it before subsequent navigation/sharing.
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
        if (!isBootstrapSecret(secret)) {
          setBootstrapSecret(null);
          setError(t("auth.bootstrapInvalid"));
          return;
        }
        saveBootstrapSecret(slug, supabaseUrl, secret);
        setBootstrapSecret(secret);
        setMode("signup");
      } else {
        setBootstrapSecret(loadBootstrapSecret(slug, supabaseUrl));
      }
    }
    readFounderLink();
    window.addEventListener("hashchange", readFounderLink);
    return () => window.removeEventListener("hashchange", readFounderLink);
  }, [slug, supabaseUrl, t]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const callback = `${origin}/d/${slug}/auth/callback?next=${encodeURIComponent(next)}`;


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "reset") {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: `${origin}/d/${slug}/auth/callback?next=${encodeURIComponent(
            href("auth/update-password")
          )}`,
        });
        if (resetError) throw resetError;
        // Deliberately always the same message: never reveal who is a member.
        setInfo(t("auth.resetSent"));
        setMode("signin");
        return;
      }

      if (mode === "signup") {
        // The reset flow is the only way back from a password typed wrong
        // once, and it costs an e-mail round trip to a department somebody has
        // not joined yet. DeptPasswordForm has always asked twice; this is the
        // screen where getting it wrong is most expensive.
        if (password !== repeat) {
          setError(t("auth.passwordMismatch"));
          setBusy(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: callback,
            // Read by handle_new_user() out of raw_user_meta_data. Sending it
            // as metadata is what lets the trigger check the code in the same
            // transaction that creates the user.
            data: {
              ...(invite.trim() ? { invite_code: invite.trim().toUpperCase() } : {}),
              ...(bootstrapSecret ? { bootstrap_secret: bootstrapSecret } : {}),
            },
          },
        });
        if (error) throw error;
        if (bootstrapSecret) {
          forgetBootstrapSecret(slug, supabaseUrl);
          setBootstrapSecret(null);
        }

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
      setError(mode === "reset" ? t("common.actionFailed") : mapAuthError(message, t, Boolean(invite.trim())));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {bootstrapSecret && mode === "signup" && (
        <p role="status" className="notice notice-ok mb-4">{t("setup.bootstrapPrivate")}</p>
      )}
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
            <div className="flex items-baseline justify-between gap-3">
              <label className="label" htmlFor="password">
                {t("auth.password")}
              </label>
              {/* A password nobody can read is a password typed wrong twice.
                  Not a checkbox: this toggles what is on screen right now, so
                  it says what it will do and reports what it did. */}
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-pressed={reveal}
                className="cursor-pointer text-xs text-ink-500 underline underline-offset-2 hover:text-ink-700"
              >
                {t(reveal ? "auth.hidePassword" : "auth.showPassword")}
              </button>
            </div>
            <input
              id="password"
              type={reveal ? "text" : "password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
            {mode === "signup" && !reveal && (
              <div className="mt-3">
                <label className="label" htmlFor="password-repeat">
                  {t("auth.repeatPassword")}
                </label>
                <input
                  id="password-repeat"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="field"
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            )}
          </div>
        )}

        {/* A public department asks for nothing but an address and a
            password. The code field is still reachable, because a code is the
            only way to arrive as an administrator -- it just stops being the
            first thing a newcomer is confronted with. */}
        {mode === "signup" && !bootstrapSecret && !showInvite && (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="cursor-pointer self-start text-xs text-gov-800 underline underline-offset-2 hover:text-gov-600"
          >
            {t("dept.haveInvite")}
          </button>
        )}

        {mode === "signup" && !bootstrapSecret && showInvite && (
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
          disabled={busy}
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setInfo(null);
          }}
          className="cursor-pointer py-1.5 text-gov-800 underline underline-offset-2 hover:text-gov-600 sm:py-0"
        >
          {mode === "signin" ? t("auth.toSignup") : t("auth.toSignin")}
        </button>

        {mode !== "reset" && (
          <button
            type="button"
            disabled={busy}
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
