import Link from "next/link";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { LanguageToggle } from "@/components/LanguageToggle";

/**
 * Header and footer for OpenDepartment's own pages.
 *
 * Kept separate from the department shell on purpose: this one talks about the
 * platform, has no session and no per-department accent. The landing page
 * builds its own hero and so does not use this.
 */
export function MarketingShell({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <header className="masthead gov-rule">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Seal size={38} idPrefix="mk-hdr" />
            <span className="font-[family-name:var(--font-serif)] text-base font-black text-white">
              <T k="od.name" />
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <LanguageToggle light />
            <Link
              href="/directory"
              className="hidden text-sm text-gov-100/80 hover:text-white sm:block"
            >
              <T k="od.directory" />
            </Link>
            <Link
              href="/new"
              className="bg-gold-500 px-3 py-2 text-sm font-bold text-gov-950 hover:bg-gold-400"
            >
              <T k="od.create" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className={`mx-auto px-4 py-12 ${wide ? "max-w-5xl" : "max-w-3xl"}`}>
          {children}
        </div>
      </main>

      <footer className="border-t-[3px] border-gold-500 bg-gov-950 text-gov-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-xs text-gov-100/60">
          <span className="font-[family-name:var(--font-serif)] text-sm font-bold text-white">
            <T k="od.name" />
          </span>
          <Link href="/legal/terms" className="hover:text-white">
            <T k="legal.terms" />
          </Link>
          <Link href="/legal/privacy" className="hover:text-white">
            <T k="legal.privacy" />
          </Link>
          <Link href="/account" className="ml-auto hover:text-white">
            <T k="account.title" />
          </Link>
        </div>
      </footer>
    </>
  );
}
