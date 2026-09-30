"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Seal } from "@/components/Seal";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";

const PLUS = (
  <svg aria-hidden width="16" height="16" viewBox="0 0 20 20">
    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export function DeptHeader({
  signedIn,
  username,
  isAdmin,
}: {
  signedIn: boolean;
  username: string | null;
  isAdmin: boolean;
}) {
  const { t } = useI18n();
  const { branding, href, slug } = useTenant();
  const supabase = useTenantClient();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const userMenu = useRef<HTMLDivElement>(null);

  // Both menus belong to the page they were opened on. Following a link
  // inside one already closed it, but the browser's back button, a link in the
  // page below, or Escape left it hanging open over whatever came next.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
    setUserOpen(false);
  }
  useEffect(() => {
    if (!menuOpen && !userOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setUserOpen(false);
      }
    }
    // A click anywhere outside the account menu closes it, as every menu on
    // every other site does.
    function onPointer(e: PointerEvent) {
      if (userMenu.current && !userMenu.current.contains(e.target as Node)) {
        setUserOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen, userOpen]);

  async function signOut() {
    setSigningOut(true);
    setSignOutFailed(false);
    // Scoped to this department's cookie only: signing out of one archive
    // leaves your membership in every other one alone. And to this browser
    // only: Supabase's default scope is "global", which revokes the member's
    // sessions for this department on every device they use -- not what a
    // button in the header of one tab says it will do.
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      router.push(href());
      router.refresh();
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  const links = signedIn
    ? [
        { href: href("vault"), label: t("nav.vault") },
        { href: href("subjects"), label: t("nav.subjects") },
        ...(isAdmin ? [{ href: href("admin"), label: t("nav.admin") }] : []),
      ]
    : [];
  const isActive = (target: string) =>
    pathname === target || pathname.startsWith(target + "/");

  // A visitor who already has an account had no way in from the header: the
  // front door's buttons are the only route, and every other public page
  // under a department (legal pages, a join link somebody forwarded) had
  // none. Left off the two pages that ARE the way in.
  const onAuthPage =
    pathname === href("login") || pathname === href("join");

  // The wizard stamps the department's name, in capitals, as the seal's top
  // legend -- so by default the line above the name in this header said the
  // name a second time. It earns its line only when it says something else.
  const eyebrow =
    branding.sealTop.trim().toLowerCase() !==
    branding.departmentName.trim().toLowerCase()
      ? branding.sealTop
      : null;

  const initial = (username ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="masthead gov-rule sticky top-0 z-40 print:hidden">
      {/* The department's own colour, as a stripe rather than as text: an
          administrator may pick any colour at all, and a stripe is legible
          whichever one it is. */}
      <div className="h-[3px] bg-accent" />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:gap-5">
        <Link
          href={signedIn ? href("vault") : href()}
          className="flex min-w-0 items-center gap-2.5 rounded-control transition-opacity hover:opacity-85 sm:gap-3"
        >
          {/* 32px on a phone, so a long department name still gets most of the
              row; the sm: class restores 40. Sized in CSS rather than by
              rendering the seal twice -- the svg passes className straight to
              its root, and a stylesheet rule beats a presentation attribute. */}
          <Seal
            size={40}
            className="size-8 shrink-0 sm:size-10"
            top={branding.sealTop}
            bottom={branding.sealBottom}
            accent={branding.accent}
            idPrefix={`hdr-${slug}`}
          />
          {/* min-w-0 on both the link and this column is what lets the
              truncation below actually happen: a flex item defaults to
              min-width:auto and would rather push the language toggle off the
              screen than let its text shorten. */}
          <span className="min-w-0 leading-tight">
            {eyebrow && (
              <span className="docket block truncate text-3xs text-ink-500">
                {eyebrow}
              </span>
            )}
            <span className="block truncate font-display text-base font-bold text-ink-900 sm:text-lg">
              {branding.departmentName}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-control px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-paper-200 text-ink-900"
                    : "text-ink-500 hover:bg-paper-200/70 hover:text-ink-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {signedIn && (
            <Link
              href={href("upload")}
              aria-current={isActive(href("upload")) ? "page" : undefined}
              className="btn btn-sm btn-accent hidden lg:inline-flex"
            >
              {PLUS}
              {t("nav.upload")}
            </Link>
          )}

          <LanguageToggle />

          {!signedIn && !onAuthPage && (
            <Link href={href("login")} className="btn btn-sm btn-ghost">
              {t("nav.signin")}
            </Link>
          )}

          {signedIn && (
            <div ref={userMenu} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setUserOpen((v) => !v)}
                aria-expanded={userOpen}
                aria-controls="dept-user-menu"
                aria-label={`${t("nav.signedInAs")} ${username ?? "—"}`}
                className="flex cursor-pointer items-center gap-2 rounded-control border border-paper-300 bg-paper-50 py-1 pr-3 pl-1 text-sm font-medium text-ink-900 transition-colors hover:border-paper-400 hover:bg-paper-100"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink">
                  {initial}
                </span>
                <span className="max-w-32 truncate">{username ?? "—"}</span>
                <svg aria-hidden width="12" height="12" viewBox="0 0 10 10" className={`text-ink-400 transition-transform ${userOpen ? "rotate-180" : ""}`}>
                  <path d="M2 3.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {userOpen && (
                <div
                  id="dept-user-menu"
                  className="animate-fade-up absolute right-0 mt-2 w-60 overflow-hidden rounded-card border border-paper-300 bg-paper-50 shadow-pop"
                >
                  <div className="border-b border-paper-300 px-4 py-3">
                    <p className="text-xs text-ink-500">{t("nav.signedInAs")}</p>
                    <p className="truncate text-sm font-semibold text-ink-900">{username ?? "—"}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href={href("account")}
                      className="block rounded-control px-3 py-2 text-sm text-ink-700 hover:bg-paper-100 hover:text-ink-900"
                    >
                      {t("member.title")}
                    </Link>
                    <button
                      type="button"
                      onClick={signOut}
                      disabled={signingOut}
                      className="block w-full cursor-pointer rounded-control px-3 py-2 text-left text-sm text-ink-700 hover:bg-paper-100 hover:text-ink-900 disabled:opacity-50"
                    >
                      {t("nav.signout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {signedIn && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="dept-mobile-menu"
              aria-label={t("nav.menu")}
              // A 40px tap target that only ever renders below lg.
              className="-mr-1.5 flex size-10 cursor-pointer items-center justify-center rounded-control text-ink-900 hover:bg-paper-200 lg:hidden"
            >
              <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d={
                    menuOpen ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"
                  }
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {menuOpen && signedIn && (
        <div id="dept-mobile-menu" className="border-t border-paper-300 bg-paper-50 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            <Link
              href={href("upload")}
              onClick={() => setMenuOpen(false)}
              className="btn btn-accent mb-2"
            >
              {PLUS}
              {t("nav.upload")}
            </Link>
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  // py-3 over a 24px line box is a 48px row. The drawer is the
                  // only navigation a phone gets, so its rows are the one place
                  // on the site where a thumb has to land reliably.
                  className={`rounded-control px-3 py-3 text-base font-medium ${
                    active ? "bg-paper-200 text-ink-900" : "text-ink-700"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-paper-300 pt-3">
              <Link
                href={href("account")}
                onClick={() => setMenuOpen(false)}
                className="flex min-w-0 items-center gap-2.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">
                  {initial}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block text-xs text-ink-500">{t("nav.signedInAs")}</span>
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {username ?? "—"}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="btn btn-sm btn-ghost shrink-0"
              >
                {t("nav.signout")}
              </button>
            </div>
          </nav>
        </div>
      )}
      {signOutFailed && <p role="alert" className="notice notice-error mx-4 mb-3">{t("common.actionFailed")}</p>}
    </header>
  );
}
