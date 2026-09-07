"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import {
  CONTROL_READY,
  createControlBrowserClient,
} from "@/lib/control/browser";
import { Spinner } from "@/components/Spinner";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { ControlAuthPanel } from "./ControlAuthPanel";
import {
  looksLikeSecretKey,
  parseSupabaseCredentials,
} from "@/lib/setup/credentials";

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
  opts: {
    name: string;
    subjectLabel: string;
    docket: string;
    openJoin: boolean;
    operatorName: string;
    operatorContact: string;
  }
): string {
  const name = opts.name.trim() || "The Department";
  const subject = opts.subjectLabel.trim() || "Case";
  const docket = opts.docket.trim().toUpperCase() || "CF";
  const operatorName = opts.operatorName.trim();
  const operatorContact = opts.operatorContact.trim();

  return `${schema}
-- ---------------------------------------------------------------------------
--  Your choices from the OpenDepartment setup wizard.
--
--  open_join is the door: ${
    opts.openJoin
      ? "you chose a public department, so anybody may\n--  create an account. Invite codes still work -- they are how somebody\n--  arrives as an administrator."
      : "you chose an unlisted department, so an invite\n--  code is required to sign up. Change it here or under Administration."
  }
--
--  operator_name and operator_contact are what your department's own imprint,
--  terms and privacy pages say. They were previously left null by the wizard,
--  which meant every new department published three legal pages that could not
--  name anybody -- and the imprint is the page a stranger reads precisely to
--  find out who to complain to. Both are editable later under Administration.
-- ---------------------------------------------------------------------------
update public.settings set
  department_name  = ${q(name)},
  subject_label    = ${q(subject)},
  docket_prefix    = ${q(docket)},
  seal_top         = ${q(name.toUpperCase())},
  seal_bottom      = ${q("OFFICIAL USE ONLY")},
  operator_name    = ${operatorName ? q(operatorName) : "operator_name"},
  operator_contact = ${operatorContact ? q(operatorContact) : "operator_contact"},
  open_join        = ${opts.openJoin}
where id;
`;
}

/**
 * Everything the wizard would be sorry to lose to a reload.
 *
 * Losing it was easy and expensive: the connect step needs an OpenDepartment
 * account, creating one can send you to your inbox and back, and returning to
 * an empty form after you have already run the SQL against a real project is
 * the worst moment in the whole flow -- the project is now claimed, so
 * starting over does not work either.
 *
 * sessionStorage rather than localStorage: this is one sitting, not a saved
 * document. Nothing here is secret -- the anon key is published on the
 * department's own front door -- but it is still not worth leaving behind on a
 * shared machine after the tab closes.
 */
const DRAFT_KEY = "od.setup.draft.v1";

type Draft = {
  name: string;
  slug: string;
  slugTouched: boolean;
  subjectLabel: string;
  docket: string;
  visibility: "unlisted" | "public";
  operatorName: string;
  operatorContact: string;
  url: string;
  anonKey: string;
  step: Step;
  /**
   * A project this wizard already created. Kept so that a reload after the
   * automatic path started cannot lead to a second one on somebody's account.
   */
  projectRef: string;
};

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
  // Who answers for this department. Written into the SQL, and from there into
  // the department's own imprint, terms and privacy pages.
  const [operatorName, setOperatorName] = useState("");
  const [operatorContact, setOperatorContact] = useState("");

  // --- step 3 / 4 -----------------------------------------------------
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [callbackCopied, setCallbackCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [pasted, setPasted] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [pasteOk, setPasteOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  /** Nothing is written back until the saved draft has been read. */
  const [restored, setRestored] = useState(false);

  // --- one-click setup ------------------------------------------------
  /**
   * null while unknown. `available` is whether this deployment registered a
   * Supabase OAuth app at all; `connected` is whether this browser is holding
   * a token for it. Neither can be answered on the client -- the client id is
   * not public and the token cookie is httpOnly, which is the point of both.
   */
  const [oauth, setOauth] = useState<{
    available: boolean;
    connected: boolean;
    organizations?: Array<{ id: string; name: string }>;
    /** Why not connected, when the answer is more useful than "no". */
    reason?: string;
    detail?: string;
  } | null>(null);
  const [org, setOrg] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [provisionStep, setProvisionStep] = useState<string | null>(null);
  const [projectRef, setProjectRef] = useState("");
  /**
   * Why the automatic path is not currently usable, in words.
   *
   * Kept apart from `error` because it has to render whether or not the OAuth
   * panel does. The panel is behind `oauth?.available`, which is null until a
   * fetch completes -- so on the very paint after coming back from Supabase,
   * the one moment this matters most, there was nowhere for a message to go
   * and the failure looked like nothing having happened at all.
   */
  const [oauthNote, setOauthNote] = useState<string | null>(null);
  const [authAutoConfigured, setAuthAutoConfigured] = useState(false);

  /**
   * Restore a draft left by an earlier visit to this page.
   *
   * Read in an effect rather than in a useState initialiser: sessionStorage
   * does not exist during the server render, and seeding state from it would
   * make the first client render disagree with the HTML that was sent.
   */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<Draft>;
        if (draft.name) setName(draft.name);
        if (draft.slug) setSlug(draft.slug);
        if (draft.slugTouched) setSlugTouched(true);
        if (draft.subjectLabel) setSubjectLabel(draft.subjectLabel);
        if (draft.docket) setDocket(draft.docket);
        if (draft.visibility) setVisibility(draft.visibility);
        if (draft.operatorName) setOperatorName(draft.operatorName);
        if (draft.operatorContact) setOperatorContact(draft.operatorContact);
        if (draft.url) setUrl(draft.url);
        if (draft.anonKey) setAnonKey(draft.anonKey);
        if (draft.projectRef) setProjectRef(draft.projectRef);
        // Never restore straight onto the done screen: step 6 is a claim about
        // a department that exists, and a stale draft is not evidence of one.
        if (draft.step && draft.step >= 1 && draft.step <= 5) {
          setStep(draft.step as Step);
        }
      }
    } catch {
      // Private mode, or a draft written by an older version of this page.
      // Either way an empty form is the right fallback.
    }
    setRestored(true);
  }, []);

  /** ...and keep it current. */
  useEffect(() => {
    if (!restored) return;
    try {
      const draft: Draft = {
        name, slug, slugTouched, subjectLabel, docket, visibility,
        operatorName, operatorContact, url, anonKey, step, projectRef,
      };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or refused. The wizard still works; it just forgets.
    }
  }, [restored, name, slug, slugTouched, subjectLabel, docket, visibility,
      operatorName, operatorContact, url, anonKey, step, projectRef]);

  /**
   * What the one-click path can do here, asked once the wizard is past naming.
   *
   * Re-asked whenever the account state changes, because "connected" is a
   * property of a cookie that the OAuth round trip sets and provisioning
   * clears -- not something this component can track on its own.
   */
  const refreshOauth = useCallback(async () => {
    try {
      const status = await fetch("/api/setup/oauth/status").then((r) => r.json());
      setOauth(status);

      // A token that exchanged and is then refused by the very first call is
      // an OAuth app missing a scope, not a connection that did not happen.
      if (status.reason === "expired") {
        // Aged out, not misconfigured. Connecting again is the whole fix.
        setOauthNote(t("setup.oauthExpired"));
      } else if (status.reason === "api_refused") {
        setOauthNote(
          t("setup.oauthScope", { status: String(status.status ?? "") }) +
            (status.detail ? ` (${status.detail})` : "")
        );
      } else if (status.reason === "api_unreachable") {
        // Not a scope problem. Sending somebody to edit their OAuth app over a
        // timeout or a 5xx is sending them to fix the wrong thing.
        setOauthNote(
          t("setup.oauthUnreachable") + (status.detail ? ` (${status.detail})` : "")
        );
      } else if (status.connected) {
        setOauthNote(null);
      }
      // Functional update, and `org` is deliberately not a dependency: reading
      // it here would give this callback a new identity every time it set the
      // value, and the effect below would fetch a second time to learn nothing.
      if (status.organizations?.length) {
        setOrg((current) => current || status.organizations[0].id);
      }
    } catch {
      setOauth({ available: false, connected: false });
    }
  }, [t]);

  useEffect(() => {
    if (step < 2) return;
    void refreshOauth();
  }, [step, signedIn, refreshOauth]);

  /**
   * The OAuth callback sends people back here with a verdict in the query
   * string, because it cannot render into a wizard whose state lives in this
   * tab. Read once, then taken out of the address bar so a reload does not
   * show a stale complaint.
   */
  useEffect(() => {
    if (!restored) return;
    const params = new URLSearchParams(window.location.search);
    const verdict = params.get("oauth");
    if (!verdict) return;

    if (verdict !== "ok") {
      // Each of these is a different thing to go and fix, so each says which.
      const reasons: Record<string, TranslationKey> = {
        unavailable: "setup.oauthNotConfigured",
        declined: "setup.oauthDeclined",
        state: "setup.oauthState",
        expired: "setup.oauthExpiredFlow",
        session: "setup.oauthSession",
        exchange: "setup.oauthExchange",
      };
      const detail = params.get("detail");
      setOauthNote(
        t(reasons[verdict] ?? "setup.oauthFailed") +
          (detail ? ` (${detail})` : "")
      );
    }
    // The automatic path only makes sense from the Supabase step onwards.
    setStep((current) => (current < 2 ? 2 : current));
    window.history.replaceState({}, "", "/new");
  }, [restored, t]);

  /** Only the connect step needs an account, so the check waits until then. */
  useEffect(() => {
    if (step !== 5 || signedIn || !CONTROL_READY) return;
    createControlBrowserClient()
      .auth.getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)));
  }, [step, signedIn]);

  /** Auto-derive the address from the name until the user edits it directly. */
  useEffect(() => {
    // Before the draft is read `name` is still empty, and deriving from it
    // would blank a restored slug on the first render after the restore.
    if (!restored || slugTouched) return;
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
    openJoin: visibility === "public",
    operatorName,
    operatorContact,
  });

  /**
   * The clipboard can refuse: an insecure origin, a browser that wants a
   * user gesture it does not think it got, a permission the person declined.
   * It used to reject into nothing, so the button said "Copy SQL" forever and
   * the paste that followed was whatever had been on the clipboard before.
   * The download below is the way out that does not need permission.
   */
  const copySql = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullSql);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyFailed(true);
    }
  }, [fullSql]);

  const downloadSql = useCallback(() => {
    const blob = new Blob([fullSql], { type: "application/sql" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${slug || "department"}-schema.sql`;
    link.click();
    URL.revokeObjectURL(href);
  }, [fullSql, slug]);

  const callbackUrl = `${origin}/d/${slug || "your-slug"}/auth/callback`;

  const copyCallback = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl);
      setCallbackCopied(true);
      setTimeout(() => setCallbackCopied(false), 2500);
    } catch {
      // The address is on screen and selectable; nothing more to say.
    }
  }, [callbackUrl]);

  /**
   * Take a project URL and a key out of whatever was pasted.
   *
   * Both values live in different corners of the Supabase dashboard, and a
   * legacy anon key already names its own project in its payload -- so in the
   * common case pasting the key alone fills in both fields.
   */
  function acceptPaste(text: string) {
    const parsed = parseSupabaseCredentials(text);

    if (!parsed.url && !parsed.key) {
      setPasteOk(false);
      setPasteNote(t("setup.pasteNothing"));
      return;
    }
    if (parsed.key && looksLikeSecretKey(parsed.key)) {
      // Say so here rather than after a round trip. The server refuses it too,
      // and so does a CHECK constraint in the control plane -- but the person
      // holding a secret key on their clipboard should hear about it now.
      setPasteOk(false);
      setPasteNote(t("setup.serviceKeyRejected"));
      return;
    }

    if (parsed.url) setUrl(parsed.url);
    if (parsed.key) setAnonKey(parsed.key);
    setError(null);
    setPasteOk(true);
    setPasteNote(
      parsed.derivedUrl ? t("setup.pasteDerived") : t("setup.pasteFound")
    );
  }

  /**
   * Create the project, run the schema, and configure auth -- in one call.
   *
   * This is the manual middle of this wizard (create a project, wait, paste
   * SQL, turn off e-mail confirmation, allow the callback URL, copy two values
   * back) done against a token the person authorised. What it does NOT do is
   * register the department: that still happens from this browser under their
   * own control-plane session, with the same per-account cap, exactly as the
   * manual path does.
   */
  async function provision() {
    setProvisioning(true);
    setError(null);
    setProvisionStep(t("setup.provisionCreating"));

    let result: {
      ok?: boolean;
      error?: string;
      detail?: string;
      ref?: string;
      url?: string;
      key?: string;
      authConfigured?: boolean;
    };

    try {
      result = await fetch("/api/setup/provision", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || "OpenDepartment",
          slug,
          org,
          sql: fullSql,
          // Sent only when resuming: the server creates nothing if it is set,
          // so a retry cannot leave a second project on somebody's account.
          ref: projectRef || undefined,
        }),
      }).then((r) => r.json());
    } catch {
      setProvisioning(false);
      setProvisionStep(null);
      setError(t("setup.probeFailed"));
      return;
    }

    // Remember the project even when the request failed after creating it.
    if (result.ref) setProjectRef(result.ref);
    setProvisioning(false);
    setProvisionStep(null);

    if (!result.ok) {
      const map: Record<string, string> = {
        NOT_CONNECTED: t("setup.oauthExpired"),
        NOT_SIGNED_IN: t("setup.signInFirst"),
        RATE_LIMITED: t("setup.rateLimited"),
        NO_ORGANISATION: t("setup.noOrganisation"),
        AUTH_EXPIRED: t("setup.oauthExpired"),
        API_REFUSED: t("setup.oauthRefused"),
        STILL_STARTING: t("setup.stillStarting"),
        SCHEMA_FAILED: t("setup.schemaFailedAuto"),
      };
      // `detail` is APPENDED, never merely a fallback. It used to be reachable
      // only when no mapped string existed, so on every failure this wizard had
      // a name for, Supabase's own account of what went wrong was thrown away
      // -- leaving a confident sentence about a cause nobody had checked. The
      // sentence says what to try; the detail says what actually happened.
      setError(
        [
          (result.error ? map[result.error] : undefined) ?? t("common.error"),
          result.detail,
        ]
          .filter(Boolean)
          .join(" ")
      );
      // A project that exists but was not ready yet leaves the token in place,
      // so the same button resumes rather than starting again.
      if (result.url) setUrl(result.url);
      void refreshOauth();
      return;
    }

    setUrl(result.url ?? "");
    setAnonKey(result.key ?? "");
    setAuthAutoConfigured(Boolean(result.authConfigured));
    void refreshOauth();
    setStep(5);
  }

  async function verifyAndCreate() {
    setBusy(true);
    setError(null);

    const cleanUrl = url.trim().replace(/\/+$/, "");

    // 1. Does their project answer, and is the schema in place?
    //
    // Wrapped, because this used to be the one call in the wizard that could
    // leave it stuck: a dropped connection, or any response that is not JSON
    // (a proxy error page, a cold-start 500), rejected into nothing at all --
    // `busy` stayed true, the button stayed disabled reading "Checking your
    // project...", and the only way on was a reload, which at that point threw
    // the form away too.
    let probe: { ok?: boolean; error?: string; claimed?: boolean };
    try {
      const response = await fetch("/api/setup/probe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: cleanUrl, key: anonKey.trim() }),
      });
      probe = await response.json();
    } catch {
      setError(t("setup.probeFailed"));
      setBusy(false);
      return;
    }

    if (!probe.ok) {
      const map: Record<string, string> = {
        SERVICE_KEY: t("setup.serviceKeyRejected"),
        SCHEMA_MISSING: t("setup.schemaMissing"),
        UNREACHABLE: t("setup.unreachable"),
        BAD_URL: t("setup.unreachable"),
        BAD_KEY: t("setup.unreachable"),
        // The probe needs an account -- it reports whether a project is
        // unclaimed, and an unclaimed project is one signup away from
        // belonging to whoever finds it. The button below is disabled until
        // `signedIn`, so this is the session having expired mid-wizard rather
        // than a step out of order.
        NOT_SIGNED_IN: t("setup.signInFirst"),
        NO_CONTROL_PLANE: t("setup.noControlPlane"),
        RATE_LIMITED: t("setup.rateLimited"),
      };
      if (probe.error === "NOT_SIGNED_IN") setSignedIn(false);
      setError(
        (probe.error ? map[probe.error] : undefined) ?? t("common.error")
      );
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

    // The department exists now, so the draft has nothing left to protect --
    // and leaving it behind would offer to re-run a wizard whose slug is taken
    // and whose project is claimed.
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      // Nothing to clean up.
    }

    setBusy(false);
    setStep(6);
  }

  const canLeaveStep1 =
    name.trim().length > 0 && slugState === "free" && docket.trim().length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
      <h1 className="mb-1 font-serif text-2xl font-black break-words text-ink-900 sm:text-3xl">
        {t("setup.title")}
      </h1>
      {step < 6 && (
        <p className="docket mb-8 text-2xs text-ink-500">{t("setup.step", { n: step, total: 5 })}</p>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 1 && (
        <div className="paper space-y-6 p-5 sm:p-6">
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
              {/*
                The origin is 20-odd characters of prefix in front of a field
                the user has to actually read while typing. On a phone it left
                the input hanging off the right edge of the screen, so below
                sm only "/d/" stays and the whole address is spelled out under
                the field instead.
              */}
              <span className="typewriter shrink-0 py-2 pr-0.5 pl-2 text-sm text-ink-400 sm:pr-2">
                <span className="hidden sm:inline">{origin}</span>/d/
              </span>
              <input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                // min-w-0: an <input> carries an intrinsic default width and
                // min-width:auto, which is what let it push the box wider than
                // the screen rather than taking the room it was given.
                className="typewriter w-full min-w-0 flex-1 bg-transparent px-1 py-2 text-base text-ink-900 outline-none sm:text-sm"
                spellCheck={false}
              />
            </div>
            <p className="mt-1 text-xs text-ink-500">
              <span className="typewriter text-ink-400 sm:hidden">
                {origin}/d/
              </span>{" "}
              {t("setup.slugHelp")}
            </p>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {/* One question, two answers, and each answer settles both the
              listing and the door -- because "public" that still demands an
              invite code is not what anybody means by public. Either half can
              be changed afterwards: the listing under Your departments, the
              door under Administration. */}
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink-900">
              {t("setup.visibility")}
            </legend>
            {(["unlisted", "public"] as const).map((v) => (
              <label key={v} className="mb-2 flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  checked={visibility === v}
                  onChange={() => setVisibility(v)}
                  className="mt-1"
                />
                <span>
                  <span className="text-ink-700">
                    {t(v === "unlisted" ? "setup.unlisted" : "setup.public")}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">
                    {t(
                      v === "unlisted"
                        ? "setup.unlistedHelp"
                        : "setup.publicHelp"
                    )}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {/* Who answers for this archive.

              Not decoration and not a nicety: these two values are the whole
              content of the department's imprint, and the footer has linked to
              that page since before it existed. The wizard never asked, so
              every department created through it published an imprint that
              could not name anybody -- which is the one page a stranger opens
              specifically to find out who to complain to. Optional here
              because a department can be finished later under Administration;
              asked here because almost nobody goes back. */}
          <fieldset className="border-t border-paper-300 pt-5">
            <legend className="sr-only">{t("setup.operator")}</legend>
            <p className="mb-1 text-sm font-semibold text-ink-900">
              {t("setup.operator")}
            </p>
            <p className="mb-4 text-xs text-ink-500">
              {t("setup.operatorHelp")}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label={t("setup.operatorName")}
                value={operatorName}
                onChange={setOperatorName}
                placeholder={t("setup.operatorNamePlaceholder")}
              />
              <Field
                label={t("setup.operatorContact")}
                value={operatorContact}
                onChange={setOperatorContact}
                placeholder="name@example.com"
              />
            </div>
          </fieldset>

          <Next disabled={!canLeaveStep1} onClick={() => setStep(2)} />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {step === 2 && (
        <div className="paper space-y-5 p-5 sm:p-6">
          <p className="text-base text-ink-900">{t("setup.supabaseIntro")}</p>

          {/* Outside the panel below, deliberately: that one only renders once
              a fetch has said the feature exists, and the moment a message
              matters most is the paint right after coming back from Supabase,
              before any of that has happened. */}
          {oauthNote && (
            <p role="alert" className="notice notice-error text-xs">
              {oauthNote}
            </p>
          )}

          {/* The automatic path, when this deployment has registered a
              Supabase OAuth app. It replaces the whole manual middle of this
              wizard -- create a project, wait for it, paste the SQL, turn off
              e-mail confirmation, allow the callback URL, copy two values back
              -- with one button. The manual path stays below it, because it is
              the only one that works when the deployment has no OAuth app, and
              because some people would simply rather not authorise anything. */}
          {oauth?.available && (
            <div className="border-l-4 border-stamp-green bg-stamp-green/5 p-4">
              <p className="mb-1 text-sm font-bold text-ink-900">
                {t("setup.autoTitle")}
              </p>
              <p className="mb-3 text-sm leading-relaxed text-ink-700">
                {t("setup.autoBody")}
              </p>

              {!oauth.connected ? (
                <>
                  <p className="mb-3 text-xs leading-relaxed text-ink-500">
                    {t("setup.autoTrust")}
                  </p>
                  <a
                    href="/api/setup/oauth/start"
                    className="btn btn-primary"
                  >
                    {t("setup.autoConnect")} ↗
                  </a>
                  {!signedIn && (
                    <p className="mt-2 text-xs text-ink-500">
                      {t("setup.autoNeedsAccount")}
                    </p>
                  )}
                </>
              ) : (
                <>
                  {(oauth.organizations?.length ?? 0) > 1 && (
                    <div className="mb-3">
                      <label className="label" htmlFor="setup-org">
                        {t("setup.autoOrg")}
                      </label>
                      <select
                        id="setup-org"
                        className="field"
                        value={org}
                        onChange={(e) => setOrg(e.target.value)}
                      >
                        {oauth.organizations?.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={provision}
                    disabled={provisioning}
                    aria-busy={provisioning}
                    className="btn btn-primary"
                  >
                    {provisioning && <Spinner />}
                    {provisioning
                      ? (provisionStep ?? t("setup.verifying"))
                      : projectRef
                        ? t("setup.autoResume")
                        : t("setup.autoGo")}
                  </button>
                  {provisioning && (
                    <p className="mt-2 text-xs text-ink-500">
                      {t("setup.autoPatience")}
                    </p>
                  )}
                </>
              )}

              {error && (
                <p role="alert" className="notice notice-error mt-3 text-xs">
                  {error}
                </p>
              )}
            </div>
          )}

          <div>
            <p className="mb-1 text-sm font-bold text-ink-900">
              {oauth?.available ? t("setup.manualTitle") : ""}
            </p>
            <p className="text-sm leading-relaxed text-ink-700">
              {t("setup.supabaseSteps")}
            </p>
          </div>

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
        <div className="paper space-y-4 p-5 sm:p-6">
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

          {/* The clipboard is not always available -- an insecure origin, or a
              browser that declined. Saying so, and offering the file instead,
              beats a button that quietly did nothing. */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://supabase.com/dashboard/project/_/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-primary"
            >
              {t("setup.openSqlEditor")} ↗
            </a>
            <button
              type="button"
              onClick={downloadSql}
              className="cursor-pointer text-xs text-gov-800 underline underline-offset-2"
            >
              {t("setup.downloadSql")}
            </button>
          </div>

          {copyFailed && (
            <p role="alert" className="notice notice-error text-xs">
              {t("setup.copyFailed")}
            </p>
          )}

          <Nav onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel={t("setup.sqlDone")} />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* The step everyone skips and then files a bug about. A new Supabase
          project silently refuses to mail anyone outside your own team, so
          without this the first invited member simply never gets their
          confirmation and nobody can tell why. */}
      {step === 4 && (
        <div className="paper space-y-5 p-5 sm:p-6">
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
        <div className="paper space-y-5 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-ink-700">
            {t("setup.credsIntro")}
          </p>

          {/* One box, because in the common case one paste is all this needs.

              The two values live in different corners of the dashboard, and a
              legacy anon key already names its own project in its payload --
              so pasting the key fills in the URL as well. The fields below stay
              editable: the current sb_publishable_ keys are opaque and name
              nothing, and a project on .supabase.in cannot be rebuilt from a
              project reference either. */}
          <div>
            <label className="label" htmlFor="setup-paste">
              {t("setup.paste")}
            </label>
            <textarea
              id="setup-paste"
              className="field typewriter min-h-20 resize-y text-xs"
              placeholder={t("setup.pastePlaceholder")}
              spellCheck={false}
              value={pasted}
              // onChange rather than onPaste alone: a paste on a phone
              // keyboard, or through an IME, does not always arrive as a paste
              // event. The length floor is what keeps this from complaining
              // once per keystroke at somebody who is typing the URL out by
              // hand -- nothing shorter than this can hold a key or a URL.
              onChange={(e) => {
                const text = e.target.value;
                setPasted(text);
                if (text.trim().length >= 20) acceptPaste(text);
                else setPasteNote(null);
              }}
            />
            <p className="mt-1 text-xs text-ink-500">{t("setup.pasteHelp")}</p>
            {pasteNote && (
              <p
                role="status"
                className={`mt-1 text-xs ${
                  pasteOk ? "text-stamp-green" : "text-stamp-red"
                }`}
              >
                {pasteNote}
              </p>
            )}
          </div>

          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-gov-800 underline underline-offset-2"
          >
            {t("setup.openApiSettings")} ↗
          </a>

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

          {authAutoConfigured ? (
            <div className="border-l-4 border-stamp-green bg-stamp-green/5 p-3">
              <p className="text-xs leading-relaxed text-ink-700">
                {t("setup.autoConfigured")}
              </p>
            </div>
          ) : (
          <>
          {/* Not a footnote. A redirect URL that is not on the allowlist means
              every confirmation link and every password reset in this
              department lands on an error page instead of signing anybody in,
              and the failure surfaces days later as "the invite link is
              broken". Copyable, because retyping it is where it goes wrong. */}
          <div className="border-l-4 border-gov-700 bg-gov-100/40 p-3">
            <p className="mb-1 text-xs font-bold text-ink-900">
              {t("setup.redirectTitle")}
            </p>
            <p className="mb-2 text-xs text-ink-700">{t("setup.redirectNote")}</p>
            <code className="typewriter block break-all text-xs text-ink-900">
              {callbackUrl}
            </code>
            <button
              type="button"
              onClick={copyCallback}
              className="mt-2 cursor-pointer text-xs text-gov-800 underline underline-offset-2"
            >
              {callbackCopied ? t("setup.sqlCopied") : t("setup.copyCallback")}
            </button>
          </div>
          </>
          )}

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
                STATIC_DEPARTMENTS={"{"}&quot;{slug || "test"}&quot;:{"{"}
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
        <div className="paper space-y-5 p-5 sm:p-8">
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
              <span>
                {t(visibility === "public" ? "setup.next2Open" : "setup.next2")}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="typewriter shrink-0 font-bold text-ink-900">3.</span>
              <span>
                {t(visibility === "public" ? "setup.next3Open" : "setup.next3")}
              </span>
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
