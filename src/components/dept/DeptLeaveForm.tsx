"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { STORAGE_BUCKET } from "@/lib/tenant/types";

/**
 * The member's own way out.
 *
 * Same division of labour as AdminDanger and DeleteFileButton, for the same
 * reason: leave_department() removes the rows and hands back the storage paths,
 * because deleting out of storage.objects would drop the metadata and leave the
 * bytes where they are. The objects then go through the storage API, which the
 * member's own session is already allowed to call for their own folder -- and
 * this is the last moment it is, so the removal has to happen before the
 * profile is gone rather than being left to an administrator's orphan sweep.
 *
 * The confirmation is the member's own username, checked again inside the
 * database. Somebody who never chose one types the word instead, because there
 * is nothing else of theirs to ask for.
 */
export function DeptLeaveForm({ username }: { username: string | null }) {
  const { t } = useI18n();
  const { href } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectsLeft, setObjectsLeft] = useState(false);

  const expected = username?.trim() || "leave";
  const matches = typed.trim().toLowerCase() === expected.toLowerCase();

  async function leave() {
    if (!matches) {
      setError(t("leave.mismatch"));
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("leave_department", {
        confirm: typed.trim(),
      });

      if (rpcError || !data) {
        setBusy(false);
        // A department that has not re-run the schema since this was added has
        // no such function. That is a missing upgrade with a fix its
        // administrator can carry out, not the same thing as a refusal.
        setError(
          rpcError?.message?.includes("leave_department")
            ? t("leave.unavailable")
            : rpcError?.message?.includes("LAST_ADMIN")
              ? t("leave.lastAdmin")
              : rpcError?.message?.includes("CONFIRMATION_MISMATCH")
                ? t("leave.mismatch")
                : t("common.error")
        );
        return;
      }

      const result = data as { storage_paths?: string[] };

      // In batches, like the purge: the storage API takes a list, and one
      // refusal should not cost the removals that did work.
      const paths = result.storage_paths ?? [];
      let failed = false;
      for (let i = 0; i < paths.length; i += 100) {
        try {
          const { error: storageError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove(paths.slice(i, i + 100));
          if (storageError) failed = true;
        } catch {
          failed = true;
        }
      }

      // The membership is gone either way, so this is a notice and not a
      // failure -- but it is one an administrator has to hear about, because
      // the objects are now orphans only their sweep can reach.
      if (failed) {
        setObjectsLeft(true);
        setBusy(false);
        return;
      }

      await supabase.auth.signOut();
      router.push(href());
      router.refresh();
    } catch {
      setBusy(false);
      setError(t("common.error"));
    }
  }

  if (objectsLeft) {
    return (
      <div className="paper paper-flag-red p-5">
        <p role="status" className="text-sm leading-relaxed text-ink-900">
          {t("leave.doneObjectsLeft")}
        </p>
        <button
          type="button"
          className="btn btn-ghost mt-4"
          onClick={async () => {
            await supabase.auth.signOut();
            router.push(href());
            router.refresh();
          }}
        >
          {t("nav.signout")}
        </button>
      </div>
    );
  }

  return (
    <div className="paper paper-flag-red p-5">
      <p className="docket mb-2 text-2xs text-stamp-red">{t("leave.title")}</p>
      <p className="text-sm leading-relaxed text-ink-700">{t("leave.body")}</p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn btn-ghost-danger mt-4"
        >
          {t("leave.start")}
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <label className="label" htmlFor="leave-confirm">
            {t("leave.confirmLabel", { name: expected })}
          </label>
          <input
            id="leave-confirm"
            className="field typewriter"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />

          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={leave}
              disabled={busy || !matches}
              aria-busy={busy}
              className="btn btn-danger"
            >
              {busy && <Spinner />}
              {busy ? t("common.saving") : t("leave.submit")}
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
        </div>
      )}
    </div>
  );
}
