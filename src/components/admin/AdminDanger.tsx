"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { STORAGE_BUCKET } from "@/lib/tenant/types";

/**
 * Erase the archive.
 *
 * The one screen in the app that destroys rather than moderates, and the thing
 * it has to be honest about is its own reach. A department is carried by two
 * things in two different places: everything inside its Supabase project, and
 * a row in OpenDepartment's directory. From in here only the first is
 * reachable -- OpenDepartment holds no service_role key for anybody's project
 * and no administrator here necessarily owns the listing -- so this says the
 * other one out loud instead of letting "delete" imply it.
 *
 * The work is split the same way delete_file() splits it: purge_department()
 * removes the rows inside a transaction and hands back the storage paths, and
 * the objects themselves go through the storage API as the signed-in
 * administrator, whose own session the bucket policy already admits. Deleting
 * the rows out of storage.objects instead would drop the metadata and leave
 * the bytes exactly where they are.
 *
 * The RPC keeps the caller's own account alive, which is what makes that
 * possible: an administrator who deleted themselves along with everybody else
 * would lose the storage grant halfway through and be unable to see whether
 * any of it worked.
 */
export function AdminDanger({ departmentName }: { departmentName: string }) {
  const { t, plural } = useI18n();
  const { supabaseUrl, slug } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    files: number;
    members: number;
    objects: number;
    objectsFailed: boolean;
    accountsKept: boolean;
  } | null>(null);

  const ref = /^https:\/\/([a-z0-9-]+)\.supabase\.(co|in)$/.exec(supabaseUrl)?.[1];
  const dashboard = ref ? `https://supabase.com/dashboard/project/${ref}` : null;

  const matches =
    typed.trim().toLowerCase() === departmentName.trim().toLowerCase();

  async function erase() {
    if (!matches) {
      setError(t("danger.mismatch"));
      return;
    }

    setBusy(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("purge_department", {
      confirm: typed.trim(),
    });

    if (rpcError || !data) {
      setBusy(false);
      // A department that has not re-run the schema since this was added has
      // no such function, which is a missing upgrade rather than an error --
      // and the two are worth telling apart, because one of them has a fix
      // the administrator can carry out.
      setError(
        rpcError?.message?.includes("purge_department")
          ? t("danger.unavailable")
          : rpcError?.message?.includes("CONFIRMATION_MISMATCH")
            ? t("danger.mismatch")
            : t("common.error")
      );
      return;
    }

    const result = data as {
      files: number;
      members: number;
      accounts: string;
      storage_paths: string[];
    };

    // The rows are already gone; the objects are what is left. In batches
    // because the storage API takes a list and a department that filled a free
    // tier has thousands of them, and one refusal should not lose the count of
    // everything that did go.
    const paths = result.storage_paths ?? [];
    let removed = 0;
    let objectsFailed = false;
    for (let i = 0; i < paths.length; i += 100) {
      const batch = paths.slice(i, i + 100);
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(batch);
      if (storageError) objectsFailed = true;
      else removed += batch.length;
    }

    setBusy(false);
    setDone({
      files: Number(result.files ?? 0),
      members: Number(result.members ?? 0),
      objects: removed,
      objectsFailed,
      accountsKept: result.accounts !== "deleted",
    });
    // Every panel on this screen was rendered from rows that no longer exist.
    router.refresh();
  }

  if (done) {
    return (
      <section className="paper paper-flag-red p-5">
        <p className="docket mb-4 text-2xs text-ink-500">{t("danger.title")}</p>

        <p role="status" className="notice notice-ok text-sm">
          {plural("danger.doneFiles", done.files)}{" "}
          {plural("danger.doneMembers", done.members)}{" "}
          {plural("danger.doneObjects", done.objects)}
        </p>

        {done.objectsFailed && (
          <p role="alert" className="notice notice-error mt-2 text-xs">
            {t("danger.objectsLeft")}
          </p>
        )}
        {done.accountsKept && (
          <p className="notice notice-error mt-2 text-xs">
            {t("danger.accountsKept")}
          </p>
        )}

        <p className="mt-4 font-serif text-sm font-bold text-ink-900">
          {t("danger.nextTitle")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-700">
          {t("danger.nextBody")}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {dashboard && (
            <a
              href={dashboard}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-ghost"
            >
              {t("danger.nextProject")} ↗
            </a>
          )}
          <a href="/account" className="btn btn-sm btn-ghost">
            {t("danger.nextListing")} ↗
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="paper paper-flag-red p-5">
      <p className="docket mb-4 text-2xs text-ink-500">{t("danger.title")}</p>

      <p className="text-sm leading-relaxed text-ink-700">{t("danger.intro")}</p>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        {t("danger.scopeProject")}
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-sm btn-ghost-danger mt-4"
        >
          {t("danger.go")}
        </button>
      ) : (
        <>
          <label className="label mt-4" htmlFor={`purge-${slug}`}>
            {t("danger.confirm", { name: departmentName })}
          </label>
          <input
            id={`purge-${slug}`}
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
              onClick={erase}
              disabled={busy || !matches}
              aria-busy={busy}
              className="btn btn-danger"
            >
              {busy && <Spinner />}
              {busy ? t("danger.working") : t("danger.go")}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
              disabled={busy}
              className="btn btn-ghost"
            >
              {t("common.cancel")}
            </button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="notice notice-error mt-3 text-xs">
          {error}
        </p>
      )}
    </section>
  );
}
