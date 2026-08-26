import Link from "next/link";
import { Seal } from "@/components/Seal";
import { T } from "@/components/T";
import { LanguageToggle } from "@/components/LanguageToggle";
import { KofiButton } from "@/components/KofiButton";

export default function LandingPage() {
  return (
    <>
      <header className="masthead gov-rule">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Seal size={42} className="shrink-0" idPrefix="od-hdr" />
            <span className="font-[family-name:var(--font-serif)] text-lg font-black text-white">
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
              className="bg-gold-500 px-3 py-2 text-sm font-bold text-gov-950 transition-colors hover:bg-gold-400"
            >
              <T k="od.create" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* --- hero ------------------------------------------------------ */}
        <section className="border-b border-paper-400 bg-gov-950 text-gov-100">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-20 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="docket mb-3 !text-gold-300">
                <T k="od.tagline" />
              </p>
              <h1 className="mb-5 font-[family-name:var(--font-serif)] text-4xl font-black leading-tight text-white sm:text-5xl">
                <T k="od.name" />
              </h1>
              <p className="mb-8 max-w-prose text-base leading-relaxed text-gov-100/80">
                <T k="od.hero" />
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/new"
                  className="bg-gold-500 px-6 py-3 font-bold text-gov-950 transition-colors hover:bg-gold-400"
                >
                  <T k="od.create" />
                </Link>
                <Link
                  href="/directory"
                  className="text-sm text-gov-100/80 underline underline-offset-4 hover:text-white"
                >
                  <T k="od.browse" />
                </Link>
              </div>
              <p className="mt-4 text-xs text-gov-100/50">
                <T k="od.needSupabase" />
              </p>
            </div>

            <Seal
              size={220}
              className="mx-auto hidden drop-shadow-2xl md:block"
              idPrefix="od-hero"
            />
          </div>
        </section>

        {/* --- the three things that matter ------------------------------ */}
        <section className="mx-auto grid max-w-5xl gap-6 px-4 py-16 md:grid-cols-3">
          {[
            { title: "od.yourData", body: "od.yourDataBody" },
            { title: "od.private", body: "od.privateBody" },
            { title: "od.free", body: "od.freeBody" },
          ].map((card) => (
            <div key={card.title} className="paper p-6">
              <h2 className="mb-2 font-[family-name:var(--font-serif)] text-lg font-bold text-ink-900">
                <T k={card.title as never} />
              </h2>
              <p className="text-sm leading-relaxed text-ink-700">
                <T k={card.body as never} />
              </p>
            </div>
          ))}
        </section>

        {/* --- how it works ---------------------------------------------- */}
        <section className="border-t border-paper-400 bg-paper-50">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="mb-8 text-center font-[family-name:var(--font-serif)] text-2xl font-bold text-ink-900">
              <T k="setup.title" />
            </h2>
            <ol className="space-y-6">
              {[
                "setup.step1",
                "setup.step2",
                "setup.step3",
                "email.step",
                "setup.step4",
              ].map((step, i) => (
                  <li key={step} className="flex gap-4">
                    <span className="typewriter flex size-8 shrink-0 items-center justify-center border-2 border-ink-700 text-sm font-bold text-ink-900">
                      {i + 1}
                    </span>
                    <span className="pt-1 text-base text-ink-900">
                      <T k={step as never} />
                    </span>
                  </li>
              ))}
            </ol>
            <div className="mt-10 text-center">
              <Link
                href="/new"
                className="inline-block bg-gov-900 px-6 py-3 font-bold text-white transition-colors hover:bg-gov-800"
              >
                <T k="od.create" />
              </Link>
            </div>

            {/* Ko-fi sits on OpenDepartment's own pages only, never inside
                somebody else's department -- their members did not come to
                look at the platform's donation button. */}
            <div className="mt-14 border-t border-paper-300 pt-8 text-center">
              <p className="mb-4 text-sm text-ink-500">
                <T k="od.supportBody" />
              </p>
              <KofiButton className="flex justify-center" />
            </div>
          </div>
        </section>
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
