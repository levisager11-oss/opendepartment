"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { STORAGE_BUCKET, caseLabel, formatBytes } from "@/lib/tenant/types";
import type { AdminFile } from "./types";

export function AdminFiles({ files }: { files: AdminFile[] }) {
  const { t, formatDate } = useI18n();
  const { branding, href } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const visible = files.filter((f) => {
    if (removedIds.has(f.id)) return false;
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      (f.owner_username ?? "").toLowerCase().includes(q) ||
      (f.owner_email ?? "").toLowerCase().includes(q)
    );
  });

  async function destroy(id: string) {
    if (!confirm(t("file.deleteConfirm"))) return;
    setBusyId(id);
    setError(null);

    // delete_file() re-checks admin-or-owner inside the tenant's database and
    // hands back the storage path, so no service-role key is involved.
    let rowDeleted = false;
    try {
      const { data: path, error: rpcError } = await supabase.rpc("delete_file", {
        target: id, why: "admin",
      });
      if (rpcError) throw rpcError;
      rowDeleted = true;
      setRemovedIds((prev) => new Set(prev).add(id));
      if (typeof path === "string" && path) {
        const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        if (storageError) throw storageError;
      }
    } catch {
      setError(t(rowDeleted ? "danger.objectsLeft" : "common.actionFailed"));
    } finally {
      setBusyId(null);
      if (rowDeleted) router.refresh();
    }
  }

  return (
    <div className="paper">
      {error && <p role="alert" className="notice notice-error m-3">{error}</p>}
      <div className="border-b border-paper-300 p-3">
        <input
          className="field"
          placeholder={t("vault.search")}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="scroll-x">
        <table className="w-full min-w-3xl text-sm">
          <thead>
            <tr className="border-b border-paper-300 text-left">
              {[
                t("file.case"),
                t("upload.fileTitle"),
                t("admin.files.uploader"),
                t("admin.files.email"),
                t("file.size"),
                t("vote.score"),
                t("file.report"),
                t("file.submittedOn"),
                "",
              ].map((label, i) => (
                <th key={i} className="docket px-3 py-2 text-3xs text-ink-500">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((file) => (
              <tr
                key={file.id}
                className="border-b border-paper-200 hover:bg-paper-100"
              >
                <td className="typewriter px-3 py-2 whitespace-nowrap text-ink-500">
                  {caseLabel(file.case_number, branding.docketPrefix)}
                </td>
                <td className="max-w-64 px-3 py-2">
                  <Link
                    href={href(`file/${file.id}`)}
                    className="block truncate font-semibold text-gov-800 hover:underline"
                  >
                    {file.title}
                  </Link>
                  <span className="docket text-3xs text-ink-500">
                    {file.category} · {file.kind.toUpperCase()}
                  </span>
                </td>
                <td className="typewriter px-3 py-2 whitespace-nowrap">
                  {file.owner_username ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    tabIndex={0}
                    className="redact redact-reveal typewriter px-1 text-xs"
                  >
                    {file.owner_email ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap tabular-nums text-ink-500">
                  {formatBytes(file.size_bytes)}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  <span
                    className={
                      file.score > 0
                        ? "text-stamp-green"
                        : file.score < 0
                          ? "text-stamp-red"
                          : "text-ink-500"
                    }
                  >
                    {file.score > 0 ? `+${file.score}` : file.score}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {file.report_count > 0 ? (
                    <span className="rounded-full bg-stamp-red px-1.5 py-0.5 text-2xs font-bold text-white">
                      {file.report_count}
                    </span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-ink-500">
                  {formatDate(file.created_at)}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => destroy(file.id)}
                    disabled={Boolean(busyId)}
                    className="cursor-pointer text-xs text-stamp-red underline hover:opacity-80 disabled:opacity-40"
                  >
                    {t("file.delete")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="py-10 text-center text-sm text-ink-400">
          {t("vault.empty")}
        </p>
      )}
    </div>
  );
}
