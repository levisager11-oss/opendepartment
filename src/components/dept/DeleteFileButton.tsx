"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { STORAGE_BUCKET } from "@/lib/tenant/types";

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

  /**
   * The single-tenant original posted to an API route that used the service
   * role key. There is no such key here, so deletion runs as the signed-in
   * member: delete_file() re-checks owner-or-admin inside the database, writes
   * the audit row, and hands back the storage path so the object can go too.
   */
  async function destroy() {
    setBusy(true);
    setError(false);

    const { data: path, error: rpcError } = await supabase.rpc("delete_file", {
      target: fileId,
      why: null,
    });

    if (rpcError) {
      setError(true);
      setBusy(false);
      return;
    }

    // Best effort: the row is already gone, and storage RLS permits this for
    // the owner or an admin. A failure here leaves an orphaned object, not a
    // visible record, so it must not block the redirect.
    if (typeof path === "string" && path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    }

    router.push(href("vault"));
    router.refresh();
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
      {error && <span className="text-sm text-stamp-red">{t("common.error")}</span>}
    </div>
  );
}
