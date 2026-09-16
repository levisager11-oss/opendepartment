"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { deletedObjectPaths, STORAGE_BUCKET } from "@/lib/tenant/types";

export function DeleteFileButton({
  fileId,
  isOwner,
}: {
  fileId: string;
  isOwner: boolean;
}) {
  const { t } = useI18n();
  const { href } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [rowDeleted, setRowDeleted] = useState(false);
  const [remainingPaths, setRemainingPaths] = useState<string[]>([]);


  /**
   * The single-tenant original posted to an API route that used the service
   * role key. There is no such key here, so deletion runs as the signed-in
   * member: delete_file() re-checks owner-or-admin inside the database, writes
   * the audit row, and hands back the storage path so the object can go too.
   */
  async function destroy() {
    setBusy(true);
    setError(false);

    try {
      let paths = remainingPaths;
      if (!rowDeleted) {
        const { data, error: rpcError } = await supabase.rpc("delete_file", {
          target: fileId, why: null,
        });
        if (rpcError) throw rpcError;
        paths = deletedObjectPaths(data);
        setRowDeleted(true);
        setRemainingPaths(paths);
      }
      if (paths.length) {
        const { error: storageError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(paths);
        if (storageError) throw storageError;
        setRemainingPaths([]);
      }
      router.push(href("vault"));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (rowDeleted) {
    return (
      <div>
        <p role="status">{t("danger.doneFiles_one", { n: 1 })}</p>
        {error && <p role="alert" className="notice notice-error mt-2">{t("danger.objectsLeft")}</p>}
        <div className="mt-3 flex gap-3">
          <button type="button" className="btn btn-primary" disabled={busy} aria-busy={busy} onClick={destroy}>{busy ? t("common.saving") : t("common.retry")}</button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => {
            router.push(href("vault")); router.refresh();
          }}>{t("nav.vault")}</button>
        </div>
      </div>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="btn btn-ghost-danger"
      >
        {t("file.delete")}
        {!isOwner && <span className="docket text-3xs text-ink-500">ADMIN</span>}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-semibold text-stamp-red">
        {t("file.deleteConfirm")}
      </span>
      <button
        type="button"
        onClick={destroy}
        disabled={busy}
        className="btn btn-danger"
      >
        {busy ? t("common.saving") : t("common.confirm")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="btn btn-ghost"
      >
        {t("common.cancel")}
      </button>
      {error && <span role="alert" className="text-sm text-stamp-red">{t("common.actionFailed")}</span>}
    </div>
  );
}
