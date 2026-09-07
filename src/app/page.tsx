import { headers } from "next/headers";
import Link from "next/link";
import { Seal } from "@/components/Seal";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/MarketingShell";
import { T } from "@/components/T";
import { KofiButton } from "@/components/KofiButton";
import { SITE_NAME, SITE_URL, absolute } from "@/lib/seo";

/**
 * Structured data for the landing page.
 *
 * WebSite carries the SearchAction-less basics that let Google show a
 * sitelinks block; SoftwareApplication is the accurate type for what
 * OpenDepartment actually is -- a tool you install into your own Supabase
 * project, free, with nothing to buy. `offers` at price 0 is what makes the
 * "free" claim machine-readable rather than marketing copy.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description:
        "Run your own parody document archive on a Supabase project you own.",
      inLanguage: ["en", "de"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "WebApplication",
      operatingSystem: "Any",
      description:
        "Build a mock government archive for your class, your team or your "
        + "group chat. Members upload exhibits, vote on them and argue in the "
        + "comments. Files live in a Supabase project you own.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isAccessibleForFree: true,
      screenshot: absolute("/opengraph-image"),
    },
  ],
};

export default async function LandingPage() {
  // The Content Security Policy carries a per-request nonce, and Next stamps
  // it onto the script tags it emits itself -- but not onto one written by
  // hand. A JSON-LD block is data rather than code and is never executed, so
  // nothing here would break; browsers differ on whether they refuse the
  // element anyway, and a structured-data block that some of them drop is
  // worse than useless. The middleware puts the nonce on this header.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        // Values are our own constants, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <MarketingHeader />

      <main className="flex-1">
        {/* --- hero ------------------------------------------------------ */}
        <section className="border-b border-paper-400 bg-gov-950 text-gov-100">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-4 py-12 sm:py-20 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="docket mb-3 text-gold-300 text-2xs">
                <T k="od.tagline" />
              </p>
              <h1 className="mb-5 font-serif text-[2rem] font-black break-words leading-tight text-white sm:text-5xl">
                <T k="od.name" />
              </h1>
              <p className="mb-8 max-w-prose text-base leading-relaxed text-gov-100/80">
                <T k="od.hero" />
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/new"
                  className="btn btn-lg btn-accent"
                >
                  <T k="od.create" />
                </Link>
                <Link
                  href="/directory"
                  className="py-2 text-sm text-gov-100/80 underline underline-offset-4 hover:text-white sm:py-0"
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
        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 py-12 sm:gap-6 sm:py-16 md:grid-cols-3">
          {[
            { title: "od.yourData", body: "od.yourDataBody" },
            { title: "od.private", body: "od.privateBody" },
            { title: "od.free", body: "od.freeBody" },
          ].map((card) => (
            <div key={card.title} className="paper p-5 sm:p-6">
              <h2 className="mb-2 font-serif text-lg font-bold text-ink-900">
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
          <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
            <h2 className="mb-8 text-center font-serif text-2xl font-bold text-ink-900">
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
                className="btn btn-lg btn-primary"
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

      <MarketingFooter />
    </>
  );
}
