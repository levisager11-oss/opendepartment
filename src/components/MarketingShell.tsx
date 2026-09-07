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
      {/*
        `flex-wrap` is load-bearing below sm and inert above it. The wordmark,
        the language toggle and the call to action want about 465px between
        them -- "Departement erstellen" alone is 169px -- so on a 375px screen
        one of the three had to give. Wrapping is the option that hides
        nothing: the CTA drops to its own full-width row and everything stays
        reachable. From sm up the row has the space it always had and nothing
        wraps, so the desktop masthead is byte-for-byte the old one.
      */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        {/* Wordmark and toggle are wrapped together in a flex-1 row of their
            own so they stay on one line at every width. Left as three loose
            siblings they wrapped independently, and below about 345px the
            toggle broke onto a line by itself -- a row containing nothing but
            "DE | EN". Being flex-1 the wrapper fills whatever the button
            leaves, which on a wide screen is the same place `ml-auto` used to
            put the group. */}
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Seal size={40} className="shrink-0" idPrefix="mk-hdr" />
            <span className="truncate font-serif text-lg font-black text-white">
              <T k="od.name" />
            </span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-4">
            <LanguageToggle light />
            <Link
              href="/directory"
              className="hidden text-sm text-gov-100/80 transition-colors hover:text-white sm:block"
            >
              <T k="od.directory" />
            </Link>
          </div>
        </div>
        {/* Kept outside that wrapper so it is this element that wraps. DOM
            order is unchanged, so the desktop row still reads toggle,
            directory, button. */}
        <Link href="/new" className="btn btn-accent w-full sm:w-auto">
          <T k="od.create" />
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="gov-rule-top bg-gov-950 text-gov-100">
      {/*
        A single wrapping row on a phone came apart into ragged half-empty
        lines, with `ml-auto` flinging whichever link landed last across to
        the right margin. Below sm it is a plain left-aligned stack instead --
        one link per line, each with room to be tapped. Every rule that shapes
        the desktop row is restored at sm, `ml-auto` included.
      */}
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-2 px-4 py-8 text-xs text-gov-100/60 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
        <span className="font-serif text-sm font-bold text-white">
          <T k="od.name" />
        </span>
        <Link
          href="/legal/terms"
          className="py-1 transition-colors hover:text-white sm:py-0"
        >
          <T k="legal.terms" />
        </Link>
        <Link
          href="/legal/privacy"
          className="py-1 transition-colors hover:text-white sm:py-0"
        >
          <T k="legal.privacy" />
        </Link>
        <Link
          href="/report"
          className="py-1 transition-colors hover:text-white sm:py-0"
        >
          <T k="abuse.link" />
        </Link>
        <Link
          href="/account"
          className="py-1 transition-colors hover:text-white sm:ml-auto sm:py-0"
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
        <div className={`mx-auto px-4 py-10 sm:py-12 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
          {children}
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
