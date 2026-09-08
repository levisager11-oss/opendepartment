"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

/**
 * The cookie cookie. One year, lax, path "/" so a reader who dismissed the
 * notice on the marketing site is not shown it again inside a department.
 */
export const COOKIE_NOTICE_COOKIE = "od_cookie_notice";

/**
 * A notice, deliberately not a consent gate.
 *
 * Every cookie this app sets is one it cannot work without or one the reader
 * asked for by clicking something: the control-plane session, a department's
 * own `od-<slug>` session, the language cookie the toggle writes, and this
 * one. Those are exempt from prior consent under the ePrivacy rules that a
 * banner exists to satisfy, and there is nothing else to ask about -- no
 * advertising, no third-party analytics tag, no profile. Vercel's analytics
 * script is cookieless.
 *
 * So a two-button "accept / reject" dialog here would be theatre: "reject"
 * could not switch anything off without breaking sign-in, and a banner that
 * pretends to offer a choice it will not honour is worse for the reader than
 * one that simply says what is set and why. If a department ever gains a
 * genuinely optional cookie, this is where the choice belongs, and it has to
 * gain a real "reject" path in the same commit.
 *
 * Dismissal is stored in a cookie rather than localStorage so it survives the
 * same way the language preference does and is readable from the server if a
 * later change ever wants to render the notice server-side.
 */
export function CookieNotice() {
  const { t } = useI18n();
  const pathname = usePathname();
  // Starts hidden and is never rendered during SSR: the answer lives in
  // document.cookie, and guessing it on the server would either flash the
  // banner at somebody who dismissed it or mismatch hydration.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = document.cookie
      .split("; ")
      .some((entry) => entry.startsWith(`${COOKIE_NOTICE_COOKIE}=`));
    if (!seen) setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    document.cookie = `${COOKIE_NOTICE_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    setVisible(false);
  }

  // Inside a department the privacy notice that answers this is that
  // department's own, written by its operator; everywhere else it is the
  // platform's. Linking to the wrong one would point a reader at a document
  // that does not describe the party holding their data.
  const dept = pathname?.match(/^\/d\/([^/]+)/)?.[1];
  const privacyHref = dept
    ? `/d/${encodeURIComponent(dept)}/legal/privacy`
    : "/legal/privacy";

  return (
    <div
      role="region"
      aria-label={t("cookies.title")}
      className="sticky bottom-0 z-50 shrink-0 p-3 sm:p-4"
    >
      <div className="paper mx-auto flex max-w-3xl flex-col gap-3 p-4 shadow-lg sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1">
          <p className="font-serif text-sm font-bold text-ink-900">
            {t("cookies.title")}
          </p>
          <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-700">
            {t("cookies.body")}{" "}
            <Link
              href={privacyHref}
              className="underline underline-offset-2 hover:text-ink-900"
            >
              {t("cookies.more")}
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="btn btn-primary btn-sm w-full shrink-0 sm:w-auto"
        >
          {t("cookies.ok")}
        </button>
      </div>
    </div>
  );
}
