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
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link
          href={signedIn ? href("vault") : href()}
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <Seal
            size={46}
            className="shrink-0 drop-shadow-md"
            top={branding.sealTop}
            bottom={branding.sealBottom}
            accent={branding.accent}
            idPrefix={`hdr-${slug}`}
          />
          <span className="leading-tight">
            <span
              className="block font-serif text-2xs font-bold uppercase tracking-seal text-accent"
            >
              {branding.sealTop}
            </span>
            <span className="block font-serif text-lg font-black text-white">
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

        <div className="ml-auto flex items-center gap-4 md:ml-0">
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
              className="cursor-pointer p-1 text-white md:hidden"
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
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="border-b border-white/5 py-3 text-sm font-semibold text-gov-100/90"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center justify-between py-3">
              <span
                className="typewriter text-sm text-accent"
              >
                {username ?? "—"}
              </span>
              <button
                type="button"
                onClick={signOut}
                className="cursor-pointer text-xs text-gov-100/70 underline"
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
