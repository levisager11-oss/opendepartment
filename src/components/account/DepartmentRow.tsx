"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { createControlBrowserClient } from "@/lib/control/browser";

type Dept = {
  slug: string;
  display_name: string;
  tagline: string | null;
  visibility: string;
  status: string;
  created_at: string;
  supabase_url: string;
  anon_key: string;
};

/** What became of the tenant's own Supabase project. */
type ProjectOutcome = "deleted" | "gone" | "kept" | "untouched";

type Outcome = {
  delisted: boolean;
  project: ProjectOutcome;
  /** Supabase's own words, when it refused. */
  detail?: string;
};

/**
 * Reopen the delete panel after the Supabase round trip.
 *
 * Authorising takes the whole tab to api.supabase.com and back, and coming
 * back to a closed panel means the person who pressed Connect has to work out
 * for themselves that they are meant to press Delete again on the right row.
 * One key, cleared as soon as it is read.
 */
const REOPEN_KEY = "od-delete-open";

/** `https://abcdefghijkl.supabase.co` -> `abcdefghijkl`. */
function projectRef(url: string): string | null {
  return /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)$/.exec(url)?.[1] ?? null;
}

export function DepartmentRow({ dept }: { dept: Dept }) {
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [visibility, setVisibility] = useState(dept.visibility);
  const [name, setName] = useState(dept.display_name);
  const [refreshState, setRefreshState] = useState<
    "idle" | "busy" | "done" | "failed"
  >("idle");

  const ref = projectRef(dept.supabase_url);
  const dashboard = ref ? `https://supabase.com/dashboard/project/${ref}` : null;

  const [panel, setPanel] = useState(false);
  const [typed, setTyped] = useState("");
  const [alsoProject, setAlsoProject] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  /**
   * Whether this deployment can delete Supabase projects at all, and whether
   * this browser is currently holding an authorisation to do it.
   *
   * Neither is answerable from here: the OAuth client id is not public and the
   * token cookie is httpOnly, which is the point of both. Asked once, when the
   * panel opens, because the answer changes over an hour-long token life and a
   * stale "connected" here means a delete that stops halfway.
   */
  const [oauth, setOauth] = useState<{
    available: boolean;
    connected: boolean;
  } | null>(null);

  const openPanel = useCallback(() => {
    setPanel(true);
    setError(null);
    void (async () => {
      try {
        const status = await fetch("/api/setup/oauth/status").then((r) =>
          r.json()
        );
        // `ref` matters as much as the OAuth app does: without one there is
        // no project for /api/setup/deprovision to name, and a ticked box
        // would promise a deletion that cannot happen.
        const available = Boolean(status.available) && Boolean(ref);
        const connected = Boolean(status.connected);
        setOauth({ available, connected });
        // Nothing to offer when it cannot be done: the checkbox would promise
        // a deletion that never happens.
        if (!available || !connected) setAlsoProject(false);
      } catch {
        setOauth({ available: false, connected: false });
        setAlsoProject(false);
      }
    })();
  }, [ref]);

  useEffect(() => {
    let reopen = false;
    try {
      reopen = sessionStorage.getItem(REOPEN_KEY) === dept.slug;
      if (reopen) sessionStorage.removeItem(REOPEN_KEY);
    } catch {
      // Private mode, or storage turned off. The panel stays closed and the
      // person presses Delete again, which is the only thing lost here.
    }
    if (!reopen) return;

    openPanel();

    /**
     * Why the authorisation ended the way it did.
     *
     * The callback cannot render into this panel -- it is a redirect -- so it
     * says so in the query string, in the same vocabulary the setup wizard
     * reads, because it is the same route writing it. Without this, an
     * authorisation somebody declined or that timed out comes back to a panel
     * that has quietly redrawn the Connect button with no hint that anything
     * happened at all.
     */
    const params = new URLSearchParams(window.location.search);
    const verdict = params.get("oauth");
    if (!verdict) return;

    if (verdict !== "ok") {
      const reasons: Record<string, TranslationKey> = {
        unavailable: "setup.oauthNotConfigured",
        declined: "setup.oauthDeclined",
        state: "setup.oauthState",
        expired: "setup.oauthExpiredFlow",
        session: "setup.oauthSession",
        exchange: "setup.oauthExchange",
      };
      const detail = params.get("detail");
      setError(
        t(reasons[verdict] ?? "setup.oauthFailed") +
          (detail ? ` (${detail})` : "")
      );
    }
    // Out of the address bar, so a reload does not show a stale complaint.
    window.history.replaceState({}, "", "/account");
  }, [dept.slug, openPanel, t]);

  /**
   * Pull the department's current name and tagline out of its own project and
   * write them back to the directory entry.
   *
   * The directory caches both so /directory can render without one round trip
   * per department, which means renaming a department under its own
   * Administration screen changed the name everywhere inside it and nowhere
   * out here. This is the reconciliation.
   *
   * Deliberately the OPERATOR's job rather than something the department's own
   * admin screen posts. Nothing in the control plane can verify a name handed
   * to it, so an endpoint that accepted one would let anybody rewrite anybody's
   * directory entry. Here the write runs under departments_update_own as the
   * person who owns the row, and the value comes from a source only that
   * department's project can answer for.
   */
  async function refreshName() {
    setRefreshState("busy");

    // No session and no cookies: this is one anonymous read of a function that
    // is public by design, not a sign-in to somebody else's department.
    const tenant = createClient(dept.supabase_url, dept.anon_key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await tenant.rpc("department_identity");
    if (error || !data || data.length === 0) {
      setRefreshState("failed");
      return;
    }

    const identity = data[0] as { department_name?: string; tagline?: string | null };
    const nextName = (identity.department_name ?? "").trim().slice(0, 60);
    if (!nextName) {
      setRefreshState("failed");
      return;
    }
    const nextTagline = (identity.tagline ?? "")?.trim().slice(0, 160) || null;

    const { data: written, error: writeError } = await createControlBrowserClient()
      .from("departments")
      .update({ display_name: nextName, tagline: nextTagline })
      .eq("slug", dept.slug)
      .select("display_name");

    // Same reasoning as the settings screen inside a department: an update the
    // policy blocks touches no rows and reports no failure, so the returned
    // row is the only thing that separates "saved" from "refused".
    if (writeError || !written || written.length === 0) {
      setRefreshState("failed");
      return;
    }

    setName(nextName);
    setRefreshState("done");
    router.refresh();
  }

  async function toggleVisibility() {
    setBusy(true);
    const next = visibility === "public" ? "unlisted" : "public";
    const { error } = await createControlBrowserClient()
      .from("departments")
      .update({ visibility: next })
      .eq("slug", dept.slug);
    setBusy(false);
    if (!error) setVisibility(next);
  }

  /** Send the tab to Supabase to authorise, and come back to this panel. */
  function connect() {
    try {
      sessionStorage.setItem(REOPEN_KEY, dept.slug);
    } catch {
      /* the panel just will not reopen by itself */
    }
    window.location.href = "/api/setup/oauth/start?next=/account";
  }

  /**
   * Delete the department: the project first when asked for, then the listing.
   *
   * That order is deliberate. The project can only be found from the listing
   * (its ref is in `supabase_url`), so deleting the row first and failing on
   * the project would leave somebody holding a reference to data they can no
   * longer locate from here. The other way round, every failure still ends
   * with an address they can act on.
   *
   * The one failure that stops the whole thing is a missing or expired
   * authorisation, because that is the only one that a second press fixes --
   * everything else is reported and the listing goes anyway, since the person
   * asked for the department to be deleted and the alternative is a directory
   * entry pointing at a project they meant to be rid of.
   */
  async function destroy() {
    if (typed.trim().toLowerCase() !== dept.slug) {
      setError(t("delete.mismatch"));
      return;
    }

    setBusy(true);
    setError(null);

    let project: ProjectOutcome = "untouched";
    let detail: string | undefined;

    if (alsoProject) {
      let result: {
        ok?: boolean;
        error?: string;
        detail?: string;
        deleted?: boolean;
        alreadyGone?: boolean;
      };
      try {
        result = await fetch("/api/setup/deprovision", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug: dept.slug }),
        }).then((r) => r.json());
      } catch {
        result = { error: "UNREACHABLE" };
      }

      if (result.error === "NOT_CONNECTED" || result.error === "AUTH_EXPIRED") {
        setBusy(false);
        setOauth({ available: true, connected: false });
        setAlsoProject(false);
        setError(t("delete.reconnect"));
        return;
      }

      if (result.ok) {
        project = result.alreadyGone ? "gone" : "deleted";
      } else {
        project = "kept";
        detail = result.detail ?? result.error ?? t("common.error");
      }
    }

    // A DELETE the policy refuses touches no rows and reports no error -- a
    // suspended department is exactly that case -- so the returned row is the
    // only thing that separates "removed" from "refused".
    const { data: removed, error: deleteError } = await createControlBrowserClient()
      .from("departments")
      .delete()
      .eq("slug", dept.slug)
      .select("slug");

    setBusy(false);
    setOutcome({
      delisted: !deleteError && (removed?.length ?? 0) > 0,
      project,
      detail,
    });
  }

  // The outcome replaces the row rather than sitting beside it: a refresh takes
  // the row away, and the sentence about data still sitting in a Supabase
  // project is the one thing that must not go with it.
  //
  // Reported as two separate sentences because they are two separate
  // deletions, either of which can fail on its own: a suspended department
  // whose project WAS deleted is a real combination, and a single merged
  // "done" would be wrong about half of it.
  if (outcome) {
    const stillThere =
      outcome.project === "kept" || outcome.project === "untouched";

    return (
      <li className="paper p-4">
        <p className="font-serif text-base font-bold text-ink-900">{name}</p>

        <p
          role="status"
          className={`notice mt-3 text-sm ${
            outcome.delisted ? "notice-ok" : "notice-error"
          }`}
        >
          {outcome.delisted
            ? t("delete.doneListing")
            : dept.status === "suspended"
              ? t("delete.suspended")
              : t("delete.listingFailed")}
        </p>

        {outcome.project === "deleted" && (
          <p role="status" className="notice notice-ok mt-2 text-sm">
            {t("delete.doneProject")}
          </p>
        )}
        {outcome.project === "gone" && (
          <p className="notice mt-2 text-xs text-ink-500">
            {t("delete.projectGone")}
          </p>
        )}
        {outcome.project === "kept" && (
          <p role="alert" className="notice notice-error mt-2 text-xs">
            {t("delete.failed", { detail: outcome.detail ?? t("common.error") })}
          </p>
        )}

        {stillThere && ref && (
          <div className="paper paper-flag-red mt-3 p-4">
            <p className="font-serif text-sm font-bold text-ink-900">
              {t("delete.manualTitle")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-700">
              {t("delete.manualBody", { ref })}
            </p>
            {dashboard && (
              <a
                href={dashboard}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-ghost mt-3"
              >
                {t("delete.manualOpen")} ↗
              </a>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => router.refresh()}
          className="btn btn-sm btn-primary mt-4"
        >
          {t("delete.dismiss")}
        </button>
      </li>
    );
  }

  return (
    <li className="paper p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="w-full min-w-0 sm:flex-1">
          <p className="font-serif text-base font-bold text-ink-900">
            {name}
            {dept.status === "suspended" && (
              <span className="stamp stamp-red ml-3 stamp-sm">
                suspended
              </span>
            )}
          </p>
          <p className="docket mt-1 text-3xs text-ink-500">
            /d/{dept.slug} · {formatDate(dept.created_at)}
          </p>
        </div>

        {/* Directory listing only. The control plane cannot reach into a
            department's own database, so who may join is decided in there --
            say so rather than letting "Public" imply an open door. */}
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={busy}
          title={t("account.listingOnly")}
          className="btn btn-sm btn-ghost"
        >
          {t(visibility === "public" ? "setup.public" : "setup.unlisted")}
        </button>

        <button
          type="button"
          onClick={refreshName}
          disabled={busy || refreshState === "busy"}
          title={t("account.refreshHint")}
          className="btn btn-sm btn-ghost"
        >
          {refreshState === "busy"
            ? t("account.refreshing")
            : refreshState === "done"
              ? t("account.refreshed")
              : t("account.refresh")}
        </button>

        <Link
          href={`/d/${dept.slug}`}
          className="btn btn-sm btn-primary"
        >
          {t("account.visit")}
        </Link>

        <button
          type="button"
          onClick={() => (panel ? setPanel(false) : openPanel())}
          disabled={busy}
          aria-expanded={panel}
          className="btn btn-sm btn-ghost-danger"
        >
          {t("delete.open")}
        </button>
      </div>

      {refreshState === "failed" && (
        <p role="alert" className="mt-2 text-xs text-stamp-red">
          {t("account.refreshFailed")}
        </p>
      )}

      {panel && (
        <div className="paper paper-flag-red mt-4 p-4">
          <p className="font-serif text-base font-bold text-ink-900">
            {t("delete.title")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-700">
            {t("delete.intro")}
          </p>

          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-500">
            <li>{t("delete.layerListing", { slug: dept.slug })}</li>
            <li>{t("delete.layerProject")}</li>
          </ul>

          {dept.status === "suspended" && (
            <p role="alert" className="notice notice-error mt-3 text-xs">
              {t("delete.suspended")}
            </p>
          )}

          {/* Three states, and they are genuinely different: this deployment
              has no OAuth app at all; it has one and this browser holds no
              authorisation; it has one and the project can go with the
              listing. Only the third is a checkbox. */}
          {oauth === null ? (
            <p className="mt-4 text-xs text-ink-400">{t("common.loading")}</p>
          ) : !oauth.available ? (
            <p className="notice mt-4 text-xs text-ink-500">
              {t("delete.noOauth")}
            </p>
          ) : !oauth.connected ? (
            <div className="mt-4">
              <p className="text-xs leading-relaxed text-ink-500">
                {t("delete.connectHint")}
              </p>
              <button
                type="button"
                onClick={connect}
                className="btn btn-sm btn-ghost mt-2"
              >
                {t("delete.connect")} ↗
              </button>
            </div>
          ) : (
            <label className="mt-4 flex items-start gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={alsoProject}
                onChange={(e) => setAlsoProject(e.target.checked)}
                className="mt-1"
              />
              <span>
                {t("delete.alsoProject")}
                <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                  {t("delete.alsoProjectHint", { ref: ref ?? "" })}
                </span>
              </span>
            </label>
          )}

          {!alsoProject && (
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              {t("delete.listingOnly")}
            </p>
          )}

          <label className="label mt-4" htmlFor={`del-${dept.slug}`}>
            {t("delete.confirm", { slug: dept.slug })}
          </label>
          <input
            id={`del-${dept.slug}`}
            className="field typewriter"
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              setError(null);
            }}
            autoComplete="off"
            spellCheck={false}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={destroy}
              disabled={busy || typed.trim().toLowerCase() !== dept.slug}
              aria-busy={busy}
              className="btn btn-danger"
            >
              {busy && <Spinner />}
              {busy ? t("delete.working") : t("delete.go")}
            </button>
            <button
              type="button"
              onClick={() => {
                setPanel(false);
                setTyped("");
                setError(null);
              }}
              disabled={busy}
              className="btn btn-ghost"
            >
              {t("common.cancel")}
            </button>
          </div>

          {error && (
            <p role="alert" className="notice notice-error mt-3 text-xs">
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
