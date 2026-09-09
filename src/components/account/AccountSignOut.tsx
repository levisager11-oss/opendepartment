"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/provider";
import { createControlBrowserClient } from "@/lib/control/browser";

/**
 * The way out of an OpenDepartment account.
 *
 * There was not one. A department header has offered `nav.signout` since the
 * beginning, and the string was only ever wired up there -- so the session that
 * can register departments, repoint their coordinates and, where the deployment
 * has an OAuth app, authorise the deletion of a whole Supabase project, was the
 * one session in the product a person could not end. On a shared or borrowed
 * browser that is the account.
 *
 * Deliberately the mirror image of the department sign-out and not more: it
 * clears the control-plane cookie, which is the default Supabase one, and
 * touches no `od-<slug>` cookie. Signing out of the platform does not sign
 * anybody out of an archive they are a member of, for the same reason
 * membership in one department attaches no token to another -- the two realms
 * do not know about each other and this button is not the place to teach them.
 */
export function AccountSignOut() {
  const { t } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signOut() {
    setBusy(true);
    setFailed(false);
    try {
      const { error } = await createControlBrowserClient().auth.signOut();
      if (error) throw error;
      // Home rather than /account: the middleware would bounce this straight
      // back to the login screen, and being asked to sign in again is a
      // confusing answer to having just signed out.
      router.push("/");
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        aria-busy={busy}
        className="cursor-pointer py-1.5 text-sm text-ink-500 underline underline-offset-2 transition-colors hover:text-ink-700 disabled:opacity-50"
      >
        {t("nav.signout")}
      </button>
      {failed && (
        <p role="alert" className="text-xs text-stamp-red">
          {t("common.actionFailed")}
        </p>
      )}
    </div>
  );
}
