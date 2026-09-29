"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Seal } from "@/components/Seal";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";

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
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  // The drawer belongs to the page it was opened on. Following a link inside
  // it already closed it, but the browser's back button, a link in the page
  // below, or Escape left it hanging open over whatever came next.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

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
        { href: href("upload"), label: t("nav.upload") },
        ...(isAdmin ? [{ href: href("admin"), label: t("nav.admin") }] : []),
      ]
    : [];

  // A visitor who already has an account had no way in from the header: the
  // front door's buttons are the only route, and every other public page
  // under a department (legal pages, a join link somebody forwarded) had
  // none. Left off the two pages that ARE the way in.
  const onAuthPage =
    pathname === href("login") || pathname === href("join");

  // The wizard stamps the department's name, in capitals, as the seal's top
  // legend -- so by default the gold line above the name in this header said
  // the name a second time. It earns its line only when it says something else.
  const eyebrow =
    branding.sealTop.trim().toLowerCase() !==
    branding.departmentName.trim().toLowerCase()
      ? branding.sealTop
      : null;

  // The signed-in name is the link to the member's own page, on both layouts.
  // Nothing else in the header is a natural home for it, and a person looking
  // for their own settings looks at their own name first.

  return (
    <header className="masthead gov-rule sticky top-0 z-40 shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4">
        <Link
          href={signedIn ? href("vault") : href()}
          className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90 sm:gap-3"
        >
          {/* 34px on a phone, so a long department name still gets most of the
              row; the size prop stays 46 and the sm: class restores it, which
              is the same 46px the attribute would have drawn. Sized in CSS
              rather than by rendering the seal twice -- the svg passes
              className straight to its root, and a stylesheet rule beats a
              width/height presentation attribute. */}
          <Seal
            size={46}
            className="size-[2.125rem] shrink-0 drop-shadow-md sm:size-[2.875rem]"
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
              <span
                className="block truncate font-serif text-2xs font-bold uppercase tracking-seal text-accent"
              >
                {eyebrow}
              </span>
            )}
            <span className="block truncate font-serif text-base font-black text-white sm:text-lg">
              {branding.departmentName}
            </span>
            {branding.tagline && (
              <span className="hidden text-2xs uppercase tracking-stamp text-gov-100/60 sm:block">
                {branding.tagline}
              </span>
            )}
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-card px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-gov-100/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3 md:ml-0 md:gap-4">
          <LanguageToggle light />

          {!signedIn && !onAuthPage && (
            <Link
              href={href("login")}
              className="border-l border-white/15 pl-3 text-sm font-semibold text-gov-100/90 underline-offset-2 transition-colors hover:text-white hover:underline md:pl-4"
            >
              {t("nav.signin")}
            </Link>
          )}

          {signedIn && (
            <div className="hidden items-center gap-3 border-l border-white/15 pl-4 md:flex">
              <Link
                href={href("account")}
                className="text-right leading-tight transition-opacity hover:opacity-80"
              >
                <span className="block text-3xs uppercase tracking-wider text-gov-100/50">
                  {t("nav.signedInAs")}
                </span>
                <span
                  className="typewriter block text-sm text-accent underline-offset-2 hover:underline"
                >
                  {username ?? "—"}
                </span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="cursor-pointer text-xs text-gov-100/70 underline underline-offset-2 transition-colors hover:text-white disabled:opacity-50"
              >
                {t("nav.signout")}
              </button>
            </div>
          )}

          {signedIn && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="dept-mobile-menu"
              aria-label={t("nav.menu")}
              // -mr-2 buys the 24px glyph a 40px tap target without moving it
              // off the right margin. This button only ever renders below md.
              className="-mr-2 cursor-pointer p-2 text-white md:hidden"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
        <div id="dept-mobile-menu" className="border-t border-white/10 bg-gov-950 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  // py-3.5 over a 20px line box is a 48px row. The drawer is
                  // the only navigation a phone gets, so its rows are the one
                  // place on the site where a thumb has to land reliably.
                  className={`border-b border-white/5 py-3.5 text-sm font-semibold ${
                    active ? "text-accent" : "text-gov-100/90"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="flex items-center justify-between gap-3 py-2">
              <Link
                href={href("account")}
                onClick={() => setMenuOpen(false)}
                className="min-w-0 truncate leading-tight"
              >
                <span className="block text-3xs uppercase tracking-wider text-gov-100/50">
                  {t("nav.signedInAs")}
                </span>
                <span className="typewriter block truncate text-sm text-accent underline underline-offset-2">
                  {username ?? "—"}
                </span>
              </Link>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="-mr-2 shrink-0 cursor-pointer px-2 py-3 text-xs text-gov-100/70 underline disabled:opacity-50"
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
