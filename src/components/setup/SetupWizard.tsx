"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import {
  CONTROL_READY,
  createControlBrowserClient,
} from "@/lib/control/browser";
import { ControlAuthPanel } from "./ControlAuthPanel";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/;

/** Single-quote a value for inlining into SQL. */
function q(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * The wizard hands out the schema with the owner's choices already applied.
 *
 * The alternative would be to write these settings over the API after the
 * department is registered -- but `settings` is admin-only, and at that point
 * the department has no administrator yet, because the first person to sign up
 * becomes one. Personalising the SQL sidesteps the ordering problem entirely
 * and means the very first page load already says the right name.
 */
function personalize(
  schema: string,
  opts: { name: string; subjectLabel: string; docket: string }
): string {
  const name = opts.name.trim() || "The Department";
  const subject = opts.subjectLabel.trim() || "Case";
  const docket = opts.docket.trim().toUpperCase() || "CF";

  return `${schema}
-- ---------------------------------------------------------------------------
--  Your choices from the OpenDepartment setup wizard.
-- ---------------------------------------------------------------------------
update public.settings set
  department_name = ${q(name)},
  subject_label   = ${q(subject)},
  docket_prefix   = ${q(docket)},
  seal_top        = ${q(name.toUpperCase())},
  seal_bottom     = ${q("OFFICIAL USE ONLY")}
where id;
`;
}

export function SetupWizard({
  schemaSql,
  origin,
}: {
  schemaSql: string;
  origin: string;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);

  // --- step 1 ---------------------------------------------------------
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<
    "idle" | "checking" | "free" | "taken" | "invalid"
  >("idle");
  const [subjectLabel, setSubjectLabel] = useState("Case");
  const [docket, setDocket] = useState("CF");
  const [visibility, setVisibility] = useState<"unlisted" | "public">(
    "unlisted"
  );

  // --- step 3 / 4 -----------------------------------------------------
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  /** Only the connect step needs an account, so the check waits until then. */
  useEffect(() => {
    if (step !== 5 || signedIn || !CONTROL_READY) return;
    createControlBrowserClient()
      .auth.getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)));
  }, [step, signedIn]);

  /** Auto-derive the address from the name until the user edits it directly. */
  useEffect(() => {
    if (slugTouched) return;
    setSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32)
    );
  }, [name, slugTouched]);

  /** Debounced availability check against the control plane. */
  useEffect(() => {
    if (!slug) return setSlugState("idle");
    if (!SLUG_RE.test(slug)) return setSlugState("invalid");

    // No control plane configured: assume free and let the final step fail
    // loudly rather than blocking typing behind a client that cannot exist.
    if (!CONTROL_READY) return setSlugState("free");

    setSlugState("checking");
    const timer = setTimeout(async () => {
      const { data, error: rpcError } = await createControlBrowserClient().rpc(
        "slug_available",
        { want: slug }
      );
      if (rpcError) return setSlugState("idle");
      setSlugState(data ? "free" : "taken");
    }, 350);

    return () => clearTimeout(timer);
  }, [slug]);

  const fullSql = personalize(schemaSql, {
    name,
    subjectLabel,
    docket,
  });

  const copySql = useCallback(async () => {
    await navigator.clipboard.writeText(fullSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [fullSql]);

  async function verifyAndCreate() {
    setBusy(true);
    setError(null);

    const cleanUrl = url.trim().replace(/\/+$/, "");

    // 1. Does their project answer, and is the schema in place?
    const probe = await fetch("/api/setup/probe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: cleanUrl, key: anonKey.trim() }),
    }).then((r) => r.json());

    if (!probe.ok) {
      const map: Record<string, string> = {
        SERVICE_KEY: t("setup.serviceKeyRejected"),
        SCHEMA_MISSING: t("setup.schemaMissing"),
        UNREACHABLE: t("setup.unreachable"),
        BAD_URL: t("setup.unreachable"),
        BAD_KEY: t("setup.unreachable"),
      };
      setError(map[probe.error] ?? t("common.error"));
      setBusy(false);
      return;
    }

    // 2. An already-claimed project means they pointed us at a department that
    //    exists. Registering it here would hand its address to the wrong person.
    if (probe.claimed) {
      setError(t("setup.claimed"));
      setBusy(false);
      return;
    }

    // 3. Register the slug. RLS ties the row to the signed-in operator.
    const { error: rpcError } = await createControlBrowserClient().rpc(
      "register_department",
      {
        want_slug: slug,
        url: cleanUrl,
        key: anonKey.trim(),
        name: name.trim() || "Untitled Department",
        tag: null,
        vis: visibility,
      }
    );

    if (rpcError) {
      setBusy(false);

      // Someone claimed the address while this person was busy in Supabase.
      // Leaving them on the last step with a dead address and no way to change
      // it is the wrong end state -- send them back to the field they need.
      if (rpcError.message.includes("SLUG_UNAVAILABLE")) {
        setSlugState("taken");
        setError(null);
        setStep(1);
        return;
      }

      if (rpcError.message.includes("TOO_MANY_DEPARTMENTS")) {
        setError(t("setup.tooMany"));
        return;
      }

      setError(t("common.error"));
      return;
    }

    setBusy(false);
    setStep(6);
  }

  const canLeaveStep1 =
    name.trim().length > 0 && slugState === "free" && docket.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-1 font-serif text-3xl font-black text-ink-900">
        {t("setup.title")}
      </h1>
      {step < 6 && (
        <p className="docket mb-8 text-2xs text-ink-500">{t("setup.step", { n: step, total: 5 })}</p>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 1 && (
        <div className="paper space-y-6 p-6">
          <Field
            label={t("setup.name")}
            help={t("setup.nameHelp")}
            value={name}
            onChange={setName}
            placeholder={t("setup.namePlaceholder")}
          />

          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-900">
              {t("setup.slug")}
            </label>
            <div className="flex items-center border border-paper-400 bg-white">
              <span className="typewriter px-2 py-2 text-sm text-ink-400">
                {origin}/d/
              </span>
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                className="typewriter flex-1 bg-transparent px-1 py-2 text-sm text-ink-900 outline-none"
                spellCheck={false}
              />
            </div>
            <p className="mt-1 text-xs text-ink-500">{t("setup.slugHelp")}</p>
            {slugState === "taken" && (
              <p className="mt-1 text-xs text-stamp-red">
                {t("setup.slugTaken")}
              </p>
            )}
            {slugState === "invalid" && (
              <p className="mt-1 text-xs text-stamp-red">
                {t("setup.slugInvalid")}
              </p>
            )}
            {slugState === "free" && (
              <p className="mt-1 text-xs text-stamp-green">
                {t("setup.slugFree")}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("setup.subjectLabel")}
              help={t("setup.subjectHelp")}
              value={subjectLabel}
              onChange={setSubjectLabel}
            />
            <Field
              label={t("setup.docket")}
              help={t("setup.docketHelp")}
              value={docket}
              onChange={(v) => setDocket(v.toUpperCase().slice(0, 4))}
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-900">
              {t("setup.visibility")}
            </legend>
            {(["unlisted", "public"] as const).map((v) => (
              <label key={v} className="mb-1 flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                  className="mt-1"
                />
                <span className="text-ink-700">
                  {t(v === "unlisted" ? "setup.unlisted" : "setup.public")}
                </span>
              </label>
            ))}
          </fieldset>

          <Next disabled={!canLeaveStep1} onClick={() => setStep(2)} />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 2 && (
        <div className="paper space-y-4 p-6">
          <p className="text-base text-ink-900">{t("setup.supabaseIntro")}</p>
          <p className="text-sm leading-relaxed text-ink-700">
            {t("setup.supabaseSteps")}
          </p>
          <a
            href="https://supabase.com/dashboard/new"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            {t("setup.openSupabase")} ↗
          </a>
          <Nav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 3 && (
        <div className="paper space-y-4 p-6">
          <p className="text-sm leading-relaxed text-ink-700">
            {t("setup.sqlIntro")}
          </p>

          <div className="relative">
            {/* Preview only. The copy button is the supported path -- the
                elision below is not valid SQL on its own. */}
            <pre className="max-h-64 overflow-auto border border-paper-400 bg-ink-900 p-3 text-2xs leading-relaxed text-paper-100">
              {fullSql.slice(0, 900)}
              {`\n\n-- [ ${fullSql.length - 1500} more characters elided --\n`}
              {`--   press "${t("setup.copySql")}" to take the whole thing ]\n\n`}
              {fullSql.slice(-600)}
            </pre>
            <button
              type="button"
              onClick={copySql}
              className="absolute right-2 top-2 btn btn-sm btn-accent"
            >
              {copied ? t("setup.sqlCopied") : t("setup.copySql")}
            </button>
          </div>

          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel={t("setup.sqlDone")} />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* The step everyone skips and then files a bug about. A new Supabase
          project silently refuses to mail anyone outside your own team, so
          without this the first invited member simply never gets their
          confirmation and nobody can tell why. */}
      {step === 4 && (
        <div className="paper space-y-5 p-6">
          <div className="border-l-4 border-stamp-red bg-stamp-red/5 p-4">
            <p className="mb-1 text-sm font-bold text-ink-900">
              {t("email.why")}
            </p>
            <p className="text-sm leading-relaxed text-ink-700">
              {t("email.whyBody")}
            </p>
          </div>

          <div className="border border-paper-400 bg-paper-100 p-4">
            <p className="mb-1 text-sm font-bold text-ink-900">
              {t("email.optionA")}
            </p>
            <p className="text-sm leading-relaxed text-ink-700">
              {t("email.optionABody")}
            </p>
          </div>

          <div className="border border-paper-400 bg-paper-100 p-4">
            <p className="mb-1 text-sm font-bold text-ink-900">
              {t("email.optionB")}
            </p>
            <p className="text-sm leading-relaxed text-ink-700">
              {t("email.optionBBody")}
            </p>
          </div>

          <p className="text-sm font-semibold text-stamp-green">
            {t("email.recommend")}
          </p>

          <Nav
            onBack={() => setStep(3)}
            onNext={() => setStep(5)}
            nextLabel={t("email.confirm")}
          />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 5 && (
        <div className="paper space-y-5 p-6">
          <p className="text-sm leading-relaxed text-ink-700">
            {t("setup.credsIntro")}
          </p>

          <Field
            label={t("setup.url")}
            value={url}
            onChange={setUrl}
            placeholder="https://abcdefghijklm.supabase.co"
            mono
          />
          <Field
            label={t("setup.anonKey")}
            help={t("setup.keyWarning")}
            value={anonKey}
            onChange={setAnonKey}
            placeholder="eyJhbGciOi..."
            mono
          />

          <div className="border-l-4 border-gov-700 bg-gov-100/40 p-3">
            <p className="mb-1 text-xs text-ink-700">{t("setup.redirectNote")}</p>
            <code className="typewriter block break-all text-xs text-ink-900">
              {origin}/d/{slug || "your-slug"}/auth/callback
            </code>
          </div>

          {/* Registering a slug writes to the control plane, so this step --
              and only this step -- cannot work without one. Say that out loud:
              a disabled button with no explanation is the worst possible way
              to end a five-step wizard. */}
          {!CONTROL_READY && (
            <div className="border-l-4 border-stamp-red bg-stamp-red/5 p-4">
              <p className="mb-1 text-sm font-bold text-ink-900">
                {t("setup.noControlPlane")}
              </p>
              <p className="text-sm leading-relaxed text-ink-700">
                {t("setup.noControlPlaneBody")}
              </p>
              <code className="typewriter mt-2 block break-all text-xs text-ink-900">
                DEV_DEPARTMENTS={"{"}&quot;{slug || "test"}&quot;:{"{"}
                &quot;url&quot;:&quot;{url || "https://YOURREF.supabase.co"}
                &quot;,&quot;key&quot;:&quot;{anonKey ? "…" : "YOUR_ANON_KEY"}
                &quot;{"}}"}
              </code>
            </div>
          )}

          {CONTROL_READY && signedIn === null && (
            <p className="text-sm text-ink-500">{t("common.loading")}</p>
          )}

          {CONTROL_READY && signedIn === false && (
            <ControlAuthPanel onSignedIn={() => setSignedIn(true)} />
          )}

          {error && (
            <p className="border border-stamp-red bg-stamp-red/5 p-3 text-sm text-stamp-red">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-4 py-2 text-sm text-ink-500 underline"
            >
              ←
            </button>
            <button
              type="button"
              onClick={verifyAndCreate}
              disabled={busy || !url || !anonKey || !signedIn}
              className="btn btn-primary ml-auto"
            >
              {busy ? t("setup.verifying") : t("setup.verify")}
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 6 && (
        <div className="paper space-y-5 p-8">
          <p className="stamp stamp-green mx-auto block w-fit text-sm">
            {t("setup.done")}
          </p>

          <code className="typewriter block break-all border border-paper-400 bg-paper-100 p-3 text-center text-sm text-ink-900">
            {origin}/d/{slug}
          </code>

          {/* Ordered, because the order genuinely matters: whoever signs up
              first becomes the administrator, and only an administrator can
              mint the codes everybody else needs. */}
          <ol className="space-y-3 text-sm leading-relaxed text-ink-700">
            <li className="flex gap-3">
              <span className="typewriter shrink-0 font-bold text-ink-900">1.</span>
              <span>{t("setup.next1")}</span>
            </li>
            <li className="flex gap-3">
              <span className="typewriter shrink-0 font-bold text-ink-900">2.</span>
              <span>{t("setup.next2")}</span>
            </li>
            <li className="flex gap-3">
              <span className="typewriter shrink-0 font-bold text-ink-900">3.</span>
              <span>{t("setup.next3")}</span>
            </li>
          </ol>

          <p className="notice notice-error text-xs text-ink-700">
            {t("email.reminder")}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
            <Link
              href={`/d/${slug}`}
              className="btn btn-lg btn-accent"
            >
              {t("setup.openDept")}
            </Link>
            <Link
              href="/account"
              className="text-sm text-gov-800 underline underline-offset-4"
            >
              {t("account.title")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- small local building blocks ------------------------------------- */

function Field({
  label,
  help,
  value,
  onChange,
  placeholder,
  mono,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-ink-900">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className={`field ${
          mono ? "typewriter" : ""
        }`}
      />
      {help && <p className="mt-1 text-xs text-ink-500">{help}</p>}
    </div>
  );
}

function Next({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn btn-primary w-full"
    >
      →
    </button>
  );
}

function Nav({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="px-4 py-2 text-sm text-ink-500 underline"
      >
        ←
      </button>
      <button
        type="button"
        onClick={onNext}
        className="btn btn-primary ml-auto"
      >
        {nextLabel ?? "→"}
      </button>
    </div>
  );
}
