import { headers } from "next/headers";
import Link from "next/link";
import {
  MarketingFooter,
  MarketingHeader,
} from "@/components/MarketingShell";
import { HeroMockup } from "@/components/marketing/HeroMockup";
import { T } from "@/components/T";
import { KofiButton } from "@/components/KofiButton";
import type { TranslationKey } from "@/lib/i18n/dictionary";
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
        "Run your own private archive on a Supabase project you own, hosted or self-hosted.",
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
        "A private archive for your class, your team or your group chat, "
        + "dressed up as a records office. Members upload exhibits, vote on "
        + "them and argue in the comments. Files live in a Supabase project "
        + "you own, in the cloud or on your own server.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isAccessibleForFree: true,
      screenshot: absolute("/opengraph-image"),
    },
  ],
};

/** Stroke icons for the feature cards, drawn on a 24px grid. */
const ICONS = {
  database:
    "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6 M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  lock: "M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2",
  coins: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9.5 9.5c.4-1 1.4-1.5 2.5-1.5 1.5 0 2.5.8 2.5 2 0 2.5-5 1.5-5 4 0 1.2 1 2 2.5 2 1.1 0 2.1-.5 2.5-1.5 M12 6.5V8 M12 16v1.5",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  vote: "M7 10l5-6 5 6 M7 14l5 6 5-6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4",
  key: "M14.5 3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M9.5 14.5 3 21 M6 18l2 2 M15 8h.01",
  cloud: "M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z",
  server:
    "M4 4h16v6H4z M4 14h16v6H4z M8 7h.01 M8 17h.01 M12 7h5 M12 17h5",
} as const;

function Icon({ path, className = "" }: { path: string; className?: string }) {
  return (
    <svg
      aria-hidden
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

const PROMISES: Array<{ icon: string; title: TranslationKey; body: TranslationKey }> = [
  { icon: ICONS.database, title: "od.yourData", body: "od.yourDataBody" },
  { icon: ICONS.lock, title: "od.private", body: "od.privateBody" },
  { icon: ICONS.coins, title: "od.free", body: "od.freeBody" },
];

const FEATURES: Array<{ icon: string; title: TranslationKey; body: TranslationKey; tint: string }> = [
  { icon: ICONS.upload, title: "od.feat.upload", body: "od.feat.uploadBody", tint: "bg-sky-100 text-sky-700" },
  { icon: ICONS.vote, title: "od.feat.vote", body: "od.feat.voteBody", tint: "bg-emerald-100 text-emerald-700" },
  { icon: ICONS.search, title: "od.feat.find", body: "od.feat.findBody", tint: "bg-amber-100 text-amber-700" },
  { icon: ICONS.key, title: "od.feat.members", body: "od.feat.membersBody", tint: "bg-violet-100 text-violet-700" },
];

const STEPS: TranslationKey[] = [
  "setup.step1",
  "setup.step2",
  "setup.step3",
  "email.step",
  "setup.step4",
];

export default async function LandingPage() {
  // The Content Security Policy carries a per-request nonce, and Next stamps
  // it onto the script tags it emits itself -- but not onto one written by
  // hand. A JSON-LD block is data rather than code and is never executed, so
  // nothing here would break; browsers differ on whether they refuse the
  // element anyway, and a structured-data block that some of them drop is
  // worse than useless. The proxy puts the nonce on this header.
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

      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* --- hero ------------------------------------------------------ */}
        <section className="relative overflow-hidden bg-paper-50">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(60%_60%_at_85%_20%,var(--color-gov-100),transparent_70%)]" />
          <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 pt-14 pb-20 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28">
            <div className="animate-fade-up">
              <p className="chip mb-6 bg-gov-100 text-gov-800">
                <span className="size-1.5 rounded-full bg-gov-800" />
                <T k="od.tagline" />
              </p>
              <h1 className="font-display text-[2.5rem] leading-[1.05] font-extrabold tracking-tight break-words text-ink-900 sm:text-6xl">
                <T k="od.headline" />
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-500">
                <T k="od.hero" />
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/new" className="btn btn-lg btn-primary">
                  <T k="od.create" />
                </Link>
                <Link href="/directory" className="btn btn-lg btn-ghost">
                  <T k="od.browse" />
                </Link>
              </div>
              <p className="mt-5 text-sm text-ink-500">
                <T k="od.needSupabase" />
              </p>
            </div>

            <div className="mx-auto w-full max-w-lg animate-fade-up [animation-delay:120ms] lg:max-w-none">
              <HeroMockup />
            </div>
          </div>
        </section>

        {/* --- the three things that matter ------------------------------ */}
        <section className="gov-rule-top">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-4 py-16 sm:py-20 md:grid-cols-3">
            {PROMISES.map((card) => (
              <div key={card.title} className="paper p-6">
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gov-100 text-gov-800">
                  <Icon path={card.icon} />
                </span>
                <h2 className="mb-2 font-display text-xl font-bold text-ink-900">
                  <T k={card.title} />
                </h2>
                <p className="text-sm leading-relaxed text-ink-500">
                  <T k={card.body} />
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* --- what it does ---------------------------------------------- */}
        <section className="bg-paper-50 gov-rule-top">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
                <T k="od.feat.title" />
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-500">
                <T k="od.feat.subtitle" />
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="paper lift p-6">
                  <span className={`mb-4 flex size-11 items-center justify-center rounded-xl ${f.tint}`}>
                    <Icon path={f.icon} />
                  </span>
                  <h3 className="mb-2 text-base font-semibold text-ink-900">
                    <T k={f.title} />
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-500">
                    <T k={f.body} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- where your data lives ------------------------------------- */}
        <section className="gov-rule-top">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
                <T k="od.hosting.title" />
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-500">
                <T k="od.hosting.subtitle" />
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
              <div className="paper p-7">
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-gov-100 text-gov-800">
                  <Icon path={ICONS.cloud} />
                </span>
                <h3 className="font-display text-xl font-bold text-ink-900">
                  <T k="od.hosting.cloud" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  <T k="od.hosting.cloudBody" />
                </p>
                <Link href="/new" className="btn btn-primary mt-6">
                  <T k="od.create" />
                </Link>
              </div>
              <div className="paper p-7">
                <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-ink-900 text-white">
                  <Icon path={ICONS.server} />
                </span>
                <h3 className="font-display text-xl font-bold text-ink-900">
                  <T k="od.hosting.self" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">
                  <T k="od.hosting.selfBody" />
                </p>
                <ul className="mt-5 space-y-2.5 text-sm text-ink-700">
                  {(["od.hosting.self1", "od.hosting.self2", "od.hosting.self3"] as const).map((k) => (
                    <li key={k} className="flex gap-2.5">
                      <svg aria-hidden width="18" height="18" viewBox="0 0 20 20" className="mt-px shrink-0 text-stamp-green">
                        <path d="M5 10.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <T k={k} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* --- how it works ---------------------------------------------- */}
        <section className="bg-paper-50 gov-rule-top">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
            <h2 className="mb-12 text-center font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              <T k="od.stepsTitle" />
            </h2>
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((step, i) => (
                <li key={step} className="paper flex items-center gap-4 p-5 lg:flex-col lg:items-start">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gov-800 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-base font-semibold text-ink-900">
                    <T k={step} />
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --- closing call to action ------------------------------------ */}
        <section className="px-4 py-16 sm:py-24">
          <div className="on-dark relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-gov-950 px-6 py-14 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgb(0_97_254/0.45),transparent_70%)]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                <T k="od.closing" />
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-white/70">
                <T k="od.needSupabase" />
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/new" className="btn btn-lg btn-primary">
                  <T k="od.create" />
                </Link>
                <Link href="/directory" className="btn btn-lg btn-on-dark">
                  <T k="od.browse" />
                </Link>
              </div>
            </div>
          </div>

          {/* Ko-fi sits on OpenDepartment's own pages only, never inside
              somebody else's department -- their members did not come to
              look at the platform's donation button. */}
          <div className="mx-auto mt-14 max-w-xl text-center">
            <p className="mb-4 text-sm text-ink-500">
              <T k="od.supportBody" />
            </p>
            <KofiButton className="flex justify-center" />
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
