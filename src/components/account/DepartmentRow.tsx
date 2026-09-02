"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useI18n } from "@/lib/i18n/provider";
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

export function DepartmentRow({ dept }: { dept: Dept }) {
  const { t, formatDate } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [visibility, setVisibility] = useState(dept.visibility);
  const [name, setName] = useState(dept.display_name);
  const [refreshState, setRefreshState] = useState<
    "idle" | "busy" | "done" | "failed"
  >("idle");

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

  async function delist() {
    if (!confirm(t("account.delistConfirm"))) return;
    setBusy(true);
    const { error } = await createControlBrowserClient()
      .from("departments")
      .delete()
      .eq("slug", dept.slug);
    setBusy(false);
    if (!error) router.refresh();
  }

  return (
    <li className="paper flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
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
        onClick={delist}
        disabled={busy}
        className="py-2 text-xs text-stamp-red underline underline-offset-2 disabled:opacity-40 sm:py-0"
      >
        {t("account.delist")}
      </button>

      {refreshState === "failed" && (
        <p role="alert" className="w-full text-xs text-stamp-red">
          {t("account.refreshFailed")}
        </p>
      )}
    </li>
  );
}
