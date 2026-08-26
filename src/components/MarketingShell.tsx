import Link from "next/link";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { LanguageToggle } from "@/components/LanguageToggle";

/**
 * Header and footer for OpenDepartment's own pages.
 *
 * Kept separate from the department shell on purpose: this one talks about the
 * platform, has no session and no per-department accent.
 *
 * The landing page builds its own hero and so cannot use <MarketingShell>'s
 * centred <main>. It imports MarketingHeader and MarketingFooter directly
 * instead -- they used to be copy-pasted into it, and the two copies had
 * already drifted apart (one had a hover transition on the create button, one
 * did not, and the seals were different sizes).
 */
export function MarketingHeader() {
  return (
    <header className="masthead gov-rule">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Seal size={40} className="shrink-0" idPrefix="mk-hdr" />
          <span className="font-serif text-lg font-black text-white">
            <T k="od.name" />
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <LanguageToggle light />
          <Link
            href="/directory"
            className="hidden text-sm text-gov-100/80 transition-colors hover:text-white sm:block"
          >
            <T k="od.directory" />
          </Link>
          <Link href="/new" className="btn btn-accent">
            <T k="od.create" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="gov-rule-top bg-gov-950 text-gov-100">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-xs text-gov-100/60">
        <span className="font-serif text-sm font-bold text-white">
          <T k="od.name" />
        </span>
        <Link href="/legal/terms" className="transition-colors hover:text-white">
          <T k="legal.terms" />
        </Link>
        <Link
          href="/legal/privacy"
          className="transition-colors hover:text-white"
        >
          <T k="legal.privacy" />
        </Link>
        <Link
          href="/account"
          className="ml-auto transition-colors hover:text-white"
        >
          <T k="account.title" />
        </Link>
      </div>
    </footer>
  );
}

export function MarketingShell({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <MarketingHeader />
      <main className="flex-1">
        <div className={`mx-auto px-4 py-12 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
          {children}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
