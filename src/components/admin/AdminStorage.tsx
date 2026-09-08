"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/Spinner";
import { useI18n } from "@/lib/i18n/provider";
import { useTenantClient } from "@/lib/tenant/context";
import { STORAGE_BUCKET, formatBytes } from "@/lib/tenant/types";

/**
 * What the department is actually keeping, and what it is keeping by accident.
 *
 * delete_file() removes the row and hands the storage path back for the caller
 * to delete the object, which is two steps -- and a browser closed, killed or
 * disconnected between them leaves the object behind. Nothing in the archive
 * can see it after that, and it still counts against the owner's storage. On a
 * free tier that is a real gigabyte being spent on documents that no longer
 * exist, and until now there was no way to find out.
 *
 * The listing is a `security definer` function that re-checks is_admin(); the
 * deletion runs through the storage API as the signed-in administrator, whose
 * own session the storage policy already admits. No elevated key on either
 * side -- and deleting the rows out of storage.objects instead would drop the
 * metadata and leave the bytes exactly where they are.
 */
type Orphan = { path: string; size_bytes: number; created_at: string };
const ORPHAN_GRACE_MS = 60 * 60 * 1000;
function oldOrphans(rows: Orphan[]) {
  const cutoff = Date.now() - ORPHAN_GRACE_MS;
  return rows.filter((row) => Date.parse(row.created_at) < cutoff);
}
type Usage = {
  owner_id: string;
  username: string | null;
  files: number;
  bytes: number;
};

export function AdminStorage() {
  const { t, formatDate } = useI18n();
  const supabase = useTenantClient();

  const [orphans, setOrphans] = useState<Orphan[] | null>(null);
  const [usage, setUsage] = useState<Usage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [actionFailed, setActionFailed] = useState(false);
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++latestLoad.current;
    setLoading(true);
    try {
      const [orphanResult, usageResult] = await Promise.all([
        supabase.rpc("admin_orphaned_objects"),
        supabase.rpc("admin_storage_usage"),
      ]);
      if (ticket !== latestLoad.current) return;
      if (orphanResult.error || usageResult.error) throw new Error("Storage read failed");
      setUnavailable(false);
      setOrphans(oldOrphans((orphanResult.data ?? []) as Orphan[]));
      setUsage((usageResult.data ?? []) as Usage[]);
    } catch {
      if (ticket === latestLoad.current) setUnavailable(true);
    } finally {
      if (ticket === latestLoad.current) setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
    return () => { latestLoad.current += 1; };
  }, [load]);

  async function purge() {
    if (busy || !orphans?.length) return;
    setBusy(true);
    setNote(null);
    setActionFailed(false);
    try {
      // Uploading the object and filing its row are separate writes. Give new
      // uploads time to finish, then recheck the list immediately before removal.
      const { data, error: readError } = await supabase.rpc("admin_orphaned_objects");
      if (readError) throw readError;
      const stillOrphaned = new Set(oldOrphans((data ?? []) as Orphan[]).map((o) => o.path));
      const paths = orphans.map((o) => o.path).filter((path) => stillOrphaned.has(path));
      if (paths.length) {
        const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
        if (error) throw error;
      }
      setNote(t("settings.orphansPurged", { n: paths.length }));
      await load();
    } catch {
      setActionFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const orphanBytes = (orphans ?? []).reduce((sum, o) => sum + o.size_bytes, 0);
  const totalBytes = usage.reduce((sum, u) => sum + u.bytes, 0);

  return (
    <section className="paper p-5">
      <p className="docket mb-4 text-2xs text-ink-500">{t("settings.storage")}</p>

      {loading ? (
        <p className="text-sm text-ink-500">{t("common.loading")}</p>
      ) : unavailable ? (
        <div>
          <p role="alert" className="notice notice-error text-xs">{t("common.actionFailed")}</p>
          <button type="button" className="btn btn-sm btn-ghost mt-3" onClick={() => void load()}>{t("common.retry")}</button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-900">
              {t("settings.usage")}
            </p>
            {usage.length === 0 ? (
              <p className="text-sm text-ink-400">{t("common.none")}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {usage.map((row) => (
                  <li
                    key={row.owner_id}
                    className="flex items-baseline justify-between gap-4 border-b border-paper-300 py-1"
                  >
                    <span className="typewriter truncate text-ink-700">
                      {row.username ?? "—"}
                    </span>
                    <span className="docket shrink-0 text-2xs text-ink-500">
                      {row.files} · {formatBytes(row.bytes)}
                    </span>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-4 py-1 font-semibold">
                  <span className="text-ink-900">Σ</span>
                  <span className="docket text-2xs text-ink-700">
                    {formatBytes(totalBytes)}
                  </span>
                </li>
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 text-sm font-semibold text-ink-900">
              {t("settings.orphans")}
            </p>
            <p className="mb-3 text-xs leading-relaxed text-ink-500">
              {t("settings.orphansHint")}
            </p>

            {orphans && orphans.length === 0 ? (
              <p className="text-sm text-stamp-green">
                {t("settings.orphansNone")}
              </p>
            ) : (
              <>
                <ul className="mb-3 flex max-h-48 flex-col gap-1 overflow-auto text-xs">
                  {(orphans ?? []).map((o) => (
                    <li
                      key={o.path}
                      className="flex items-baseline justify-between gap-4 border-b border-paper-300 py-1"
                    >
                      <span className="typewriter truncate text-ink-700">
                        {o.path}
                      </span>
                      <span className="docket shrink-0 text-2xs text-ink-500">
                        {formatBytes(o.size_bytes)} · {formatDate(o.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={purge}
                  disabled={busy}
                  aria-busy={busy}
                  className="btn btn-sm btn-danger"
                >
                  {busy && <Spinner />}
                  {t("settings.orphansPurge")} ({formatBytes(orphanBytes)})
                </button>
              </>
            )}

            {note && (
              <p role="status" className="mt-2 text-xs text-ink-700">
                {note}
              </p>
            )}
            {actionFailed && <p role="alert" className="notice notice-error mt-2 text-xs">{t("common.actionFailed")}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
