"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenantClient } from "@/lib/tenant/context";
import type { AdminUser } from "./types";

export function AdminUsers({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const { t, formatDate } = useI18n();
  const supabase = useTenantClient();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * Routed through admin_set_flag rather than a direct update on `profiles`.
   * The function writes the audit row and refuses to let an administrator
   * change their own flags -- which stops the one-click mistake of demoting
   * or banning yourself and locking everyone out of the department.
   */
  async function patch(id: string, changes: Partial<AdminUser>) {
    const flag =
      "is_admin" in changes
        ? "is_admin"
        : "is_banned" in changes
          ? "is_banned"
          : null;
    if (!flag) return;

    setBusyId(id);
    const { error } = await supabase.rpc("admin_set_flag", {
      target: id,
      flag,
      value: Boolean(changes[flag]),
    });
    setBusyId(null);

    if (error) {
      alert(
        error.message.includes("CANNOT_CHANGE_SELF")
          ? t("admin.users.notSelf")
          : t("common.error")
      );
      return;
    }
    router.refresh();
  }

  return (
    <div className="paper scroll-x">
      <table className="w-full min-w-3xl text-sm">
        <thead>
          <tr className="border-b border-paper-300 text-left">
            {[
              t("admin.users.username"),
              t("admin.users.email"),
              t("admin.users.files"),
              t("admin.users.joined"),
              "",
            ].map((label, i) => (
              <th key={i} className="docket px-3 py-2 text-3xs text-ink-500">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const self = user.id === currentUserId;
            return (
              <tr
                key={user.id}
                className={`border-b border-paper-200 hover:bg-paper-100 ${
                  user.is_banned ? "opacity-55" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <span className="typewriter font-bold text-gov-800">
                    {user.username ?? "—"}
                  </span>
                  {user.is_admin && (
                    <span className="ml-2 rounded-card bg-gov-800 px-1.5 py-0.5 text-3xs font-bold tracking-wider text-white">
                      {t("admin.users.admin").toUpperCase()}
                    </span>
                  )}
                  {user.is_banned && (
                    <span className="ml-2 rounded-card bg-stamp-red px-1.5 py-0.5 text-3xs font-bold tracking-wider text-white">
                      SUSPENDED
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span
                    tabIndex={0}
                    className="redact redact-reveal typewriter px-1 text-xs"
                  >
                    {user.email ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums text-ink-500">
                  {user.file_count}
                </td>
                <td className="px-3 py-2 text-xs whitespace-nowrap text-ink-500">
                  {formatDate(user.created_at)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-3 text-xs">
                    {!self && (
                      <>
                        <button
                          type="button"
                          disabled={busyId === user.id}
                          onClick={() =>
                            patch(user.id, { is_admin: !user.is_admin })
                          }
                          className="cursor-pointer text-gov-800 underline disabled:opacity-40"
                        >
                          {user.is_admin
                            ? t("admin.users.revokeAdmin")
                            : t("admin.users.makeAdmin")}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === user.id}
                          onClick={() =>
                            patch(user.id, { is_banned: !user.is_banned })
                          }
                          className="cursor-pointer text-stamp-red underline disabled:opacity-40"
                        >
                          {user.is_banned
                            ? t("admin.users.unban")
                            : t("admin.users.ban")}
                        </button>
                      </>
                    )}
                    {self && (
                      <span className="text-ink-400">({t("common.you")})</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
