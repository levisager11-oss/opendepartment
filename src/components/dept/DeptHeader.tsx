"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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

  async function signOut() {
    setSigningOut(true);
    // Scoped to this department's cookie only: signing out of one archive
    // leaves your membership in every other one alone.
    await supabase.auth.signOut();
    router.push(href());
    router.refresh();
  }

  const links = signedIn
    ? [
        { href: href("vault"), label: t("nav.vault") },
        { href: href("upload"), label: t("nav.upload") },
        ...(isAdmin ? [{ href: href("admin"), label: t("nav.admin") }] : []),
      ]
    : [];

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
            <span
              className="block truncate font-serif text-2xs font-bold uppercase tracking-seal text-accent"
            >
              {branding.sealTop}
            </span>
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

          {signedIn && (
            <div className="hidden items-center gap-3 border-l border-white/15 pl-4 md:flex">
              <span className="text-right leading-tight">
                <span className="block text-3xs uppercase tracking-wider text-gov-100/50">
                  {t("nav.signedInAs")}
                </span>
                <span
                  className="typewriter block text-sm text-accent"
                >
                  {username ?? "—"}
                </span>
              </span>
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
              aria-label="Menu"
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
        <div className="border-t border-white/10 bg-gov-950 md:hidden">
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
              <span className="min-w-0 truncate leading-tight">
                <span className="block text-3xs uppercase tracking-wider text-gov-100/50">
                  {t("nav.signedInAs")}
                </span>
                <span className="typewriter block truncate text-sm text-accent">
                  {username ?? "—"}
                </span>
              </span>
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
    </header>
  );
}
