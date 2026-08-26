"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import type { InviteEntry } from "./types";

/** Avoids 0/O and 1/I, because these get read aloud and copied by hand. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  // Grouped for legibility: XXX-XXX-XXX
  return [
    chars.slice(0, 3).join(""),
    chars.slice(3, 6).join(""),
    chars.slice(6, 9).join(""),
  ].join("-");
}

export function AdminInvites({ invites }: { invites: InviteEntry[] }) {
  const { t, formatDate } = useI18n();
  const { slug, branding } = useTenant();
  const supabase = useTenantClient();
  const router = useRouter();

  const [openJoin, setOpenJoin] = useState(branding.openJoin);
  const [doorBusy, setDoorBusy] = useState(false);
  const [doorError, setDoorError] = useState<string | null>(null);

  const [code, setCode] = useState(randomCode());
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [grantsAdmin, setGrantsAdmin] = useState(false);
  const [expiresDays, setExpiresDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    setBusy(true);
    setError(null);

    const expires =
      expiresDays.trim() && Number(expiresDays) > 0
        ? new Date(
            Date.now() + Number(expiresDays) * 24 * 60 * 60 * 1000
          ).toISOString()
        : null;

    // created_by exists on the table and had never been written, so every
    // code was anonymous -- including the ones that hand out administrator
    // rights, which are the ones an audit would want traced to somebody.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("invites").insert({
      code: clean,
      note: note.trim() || null,
      max_uses: maxUses.trim() ? Number(maxUses) : null,
      grants_admin: grantsAdmin,
      expires_at: expires,
      created_by: user?.id ?? null,
    });

    setBusy(false);

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? t("invite.duplicate")
          : t("common.error")
      );
      return;
    }

    setCode(randomCode());
    setNote("");
    setMaxUses("");
    setExpiresDays("");
    setGrantsAdmin(false);
    router.refresh();
  }

  /**
   * The door itself. `settings` is admin-writable under the tenant's own RLS,
   * so this is an ordinary update running as the signed-in administrator --
   * no elevated key, and a non-admin who forged the request would simply
   * update nothing.
   */
  async function setDoor(next: boolean) {
    if (next === openJoin) return;
    setDoorBusy(true);
    setDoorError(null);

    // Selecting the row back is what turns "RLS refused this" into an error:
    // an update the policy blocks touches no rows and reports no failure, so
    // without the returned row a non-admin would watch the radio move.
    const { data, error: updateError } = await supabase
      .from("settings")
      .update({ open_join: next })
      .eq("id", true)
      .select("open_join");

    setDoorBusy(false);
    if (updateError || !data || data.length === 0) {
      setDoorError(t("common.error"));
      return;
    }

    setOpenJoin(next);
    // The flag rides down through branding, which the layout reads per
    // request -- so the sign-up form only stops asking for a code once the
    // server has re-rendered.
    router.refresh();
  }

  async function revoke(target: string) {
    if (!confirm(t("invite.revokeConfirm"))) return;
    setBusy(true);
    await supabase.from("invites").delete().eq("code", target);
    setBusy(false);
    router.refresh();
  }

  async function copyLink(target: string) {
    await navigator.clipboard.writeText(
      `${origin}/d/${slug}/join?code=${encodeURIComponent(target)}`
    );
    setCopied(target);
    setTimeout(() => setCopied(null), 2000);
  }

  function statusOf(invite: InviteEntry): { label: string; spent: boolean } {
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { label: t("invite.expired"), spent: true };
    }
    if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
      return { label: t("invite.used"), spent: true };
    }
    return { label: t("invite.active"), spent: false };
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="paper p-4">
        <p className="mb-1 text-sm font-semibold text-ink-900">
          {t("access.title")}
        </p>
        <p className="mb-3 text-xs text-ink-500">{t("access.help")}</p>

        <div className="flex flex-col gap-2">
          {([false, true] as const).map((value) => (
            <label
              key={String(value)}
              className="flex cursor-pointer items-start gap-2 text-sm"
            >
              <input
                type="radio"
                name="open-join"
                className="mt-1 accent-gov-800"
                checked={openJoin === value}
                disabled={doorBusy}
                onChange={() => setDoor(value)}
              />
              <span>
                <span className="font-semibold text-ink-900">
                  {t(value ? "access.open" : "access.closed")}
                </span>
                <span className="mt-0.5 block text-xs text-ink-500">
                  {t(value ? "access.openHelp" : "access.closedHelp")}
                </span>
              </span>
            </label>
          ))}
        </div>

        {doorError && (
          <p role="alert" className="mt-3 text-sm text-stamp-red">
            {doorError}
          </p>
        )}
      </div>

      <form onSubmit={create} className="paper p-4">
        <p className="mb-3 text-sm font-semibold text-ink-900">
          {t("invite.create")}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="invite-code">
              {t("invite.code")}
            </label>
            <div className="flex gap-2">
              <input
                id="invite-code"
                className="field typewriter"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setCode(randomCode())}
                className="btn btn-ghost"
                title={t("invite.regenerate")}
              >
                ↻
              </button>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="invite-uses">
              {t("invite.maxUses")}
            </label>
            <input
              id="invite-uses"
              className="field"
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder={t("invite.unlimited")}
            />
          </div>

          <div>
            <label className="label" htmlFor="invite-expiry">
              {t("invite.expiresDays")}
            </label>
            <input
              id="invite-expiry"
              className="field"
              type="number"
              min={1}
              value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
              placeholder={t("invite.never")}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="label" htmlFor="invite-note">
              {t("invite.note")}
            </label>
            <input
              id="invite-note"
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("invite.notePlaceholder")}
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="btn btn-primary w-full"
            >
              {t("invite.create")}
            </button>
          </div>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={grantsAdmin}
            onChange={(e) => setGrantsAdmin(e.target.checked)}
            className="accent-gov-800"
          />
          {t("invite.grantsAdmin")}
        </label>

        {grantsAdmin && (
          <p className="notice notice-error mt-2 text-xs">
            {t("invite.grantsAdminWarning")}
          </p>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-stamp-red">
            {error}
          </p>
        )}
      </form>

      {invites.length === 0 ? (
        <div className="paper py-14 text-center">
          <span className="stamp stamp-blue text-sm">NO INVITES</span>
          <p className="mt-5 text-sm text-ink-500">{t("invite.none")}</p>
        </div>
      ) : (
        <div className="paper scroll-x">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-paper-300 text-left">
                {[
                  t("invite.code"),
                  t("invite.note"),
                  t("invite.uses"),
                  t("invite.expires"),
                  t("invite.status"),
                  "",
                ].map((label, i) => (
                  <th key={i} className="docket px-3 py-2 text-3xs text-ink-500">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invites.map((invite) => {
                const status = statusOf(invite);
                return (
                  <tr
                    key={invite.code}
                    className={`border-b border-paper-200 hover:bg-paper-100 ${
                      status.spent ? "opacity-55" : ""
                    }`}
                  >
                    <td className="typewriter px-3 py-2 whitespace-nowrap">
                      {invite.code}
                      {invite.grants_admin && (
                        <span className="stamp stamp-red ml-2 stamp-sm">
                          ADMIN
                        </span>
                      )}
                    </td>
                    <td className="max-w-64 truncate px-3 py-2 text-ink-500">
                      {invite.note ?? "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {invite.uses}
                      {invite.max_uses !== null ? ` / ${invite.max_uses}` : ""}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-ink-500">
                      {invite.expires_at
                        ? formatDate(invite.expires_at)
                        : t("invite.never")}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">
                      <span
                        className={
                          status.spent ? "text-ink-400" : "text-stamp-green"
                        }
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => copyLink(invite.code)}
                        className="cursor-pointer text-xs text-gov-800 underline hover:opacity-80"
                      >
                        {copied === invite.code
                          ? t("invite.copied")
                          : t("invite.link")}
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(invite.code)}
                        disabled={busy}
                        className="ml-3 cursor-pointer text-xs text-stamp-red underline hover:opacity-80 disabled:opacity-40"
                      >
                        {t("invite.revoke")}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
