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

/** Line icons for the feature sheet, drawn on a 24px grid. */
const ICONS = {
  upload: "M12 16V4 M7 9l5-5 5 5 M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",
  vote: "M7 10l5-6 5 6 M7 14l5 6 5-6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4",
  key: "M14.5 3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z M9.5 14.5 3 21 M6 18l2 2 M15 8h.01",
} as const;

function Icon({ path }: { path: string }) {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gov-800"
    >
      <path d={path} />
    </svg>
  );
}

/** Three clauses, numbered the way a document numbers them. */
const CLAUSES: Array<{ title: TranslationKey; body: TranslationKey }> = [
  { title: "od.yourData", body: "od.yourDataBody" },
  { title: "od.private", body: "od.privateBody" },
  { title: "od.free", body: "od.freeBody" },
];

const FEATURES: Array<{ icon: string; title: TranslationKey; body: TranslationKey }> = [
  { icon: ICONS.upload, title: "od.feat.upload", body: "od.feat.uploadBody" },
  { icon: ICONS.vote, title: "od.feat.vote", body: "od.feat.voteBody" },
  { icon: ICONS.search, title: "od.feat.find", body: "od.feat.findBody" },
  { icon: ICONS.key, title: "od.feat.members", body: "od.feat.membersBody" },
];

/** The two places a department can live, compared row by row. */
const HOSTING_ROWS: Array<{ label: TranslationKey; cloud: TranslationKey; self: TranslationKey }> = [
  { label: "od.hosting.where", cloud: "od.hosting.whereCloud", self: "od.hosting.whereSelf" },
  { label: "od.hosting.setup", cloud: "od.hosting.setupCloud", self: "od.hosting.setupSelf" },
  { label: "od.hosting.listing", cloud: "od.hosting.listingCloud", self: "od.hosting.listingSelf" },
  { label: "od.hosting.cost", cloud: "od.hosting.costCloud", self: "od.hosting.costSelf" },
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
        {/* --- hero: what it is, and a picture of it ----------------------- */}
        <section className="gov-rule bg-paper-50">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 pt-14 pb-16 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:pb-24">
            <div>
              <h1 className="font-display text-[2.5rem] leading-[1.05] font-extrabold tracking-tight break-words text-ink-900 sm:text-6xl">
                <T k="od.headline" />
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700">
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
              <p className="mt-5 max-w-xl text-sm text-ink-500">
                <T k="od.needSupabase" />
              </p>
            </div>

            <div className="mx-auto w-full max-w-lg lg:max-w-none">
              <HeroMockup />
            </div>
          </div>
        </section>

        {/* --- how every department starts: three numbered clauses -------- */}
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[20rem_1fr] lg:gap-16">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            <T k="od.clauses.title" />
          </h2>
          <ol className="divide-y divide-paper-300 border-y border-paper-300">
            {CLAUSES.map((clause, i) => (
              <li key={clause.title} className="grid gap-2 py-6 sm:grid-cols-[4rem_1fr] sm:gap-6">
                <span className="docket pt-0.5 text-sm text-ink-500">§ {i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold text-ink-900">
                    <T k={clause.title} />
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-ink-700">
                    <T k={clause.body} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* --- what it does: one sheet, four cells, no floating cards ------ */}
        <section className="gov-rule-top bg-paper-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <h2 className="max-w-3xl font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              <T k="od.feat.title" />
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
              <T k="od.feat.subtitle" />
            </p>
            <div className="mt-10 grid grid-cols-1 overflow-hidden rounded-card border border-paper-300 sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className={`p-6 sm:p-8 ${i > 0 ? "border-t border-paper-300" : ""} ${
                    i === 1 ? "sm:border-t-0 sm:border-l" : ""
                  } ${i === 3 ? "sm:border-l" : ""}`}
                >
                  <h3 className="flex items-center gap-2.5 text-base font-semibold text-ink-900">
                    <Icon path={f.icon} />
                    <T k={f.title} />
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-700">
                    <T k={f.body} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- where the files live: two columns, compared row by row ------ */}
        <section className="gov-rule-top">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <h2 className="max-w-3xl font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              <T k="od.hosting.title" />
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700">
              <T k="od.hosting.subtitle" />
            </p>

            <div className="mt-10 grid grid-cols-1 overflow-hidden rounded-card border border-paper-300 bg-paper-50 md:grid-cols-2">
              {(["cloud", "self"] as const).map((col) => (
                <div key={col} className={col === "self" ? "border-t border-paper-300 md:border-t-0 md:border-l" : ""}>
                  <h3 className="border-b border-paper-300 bg-paper-100 px-6 py-4 font-display text-lg font-bold text-ink-900">
                    <T k={col === "cloud" ? "od.hosting.cloud" : "od.hosting.self"} />
                  </h3>
                  <dl className="divide-y divide-paper-300">
                    {HOSTING_ROWS.map((row) => (
                      <div key={row.label} className="grid gap-1 px-6 py-4 sm:grid-cols-[8.5rem_1fr] sm:gap-4">
                        <dt className="text-sm text-ink-500">
                          <T k={row.label} />
                        </dt>
                        <dd className="text-sm text-ink-900">
                          <T k={col === "cloud" ? row.cloud : row.self} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-ink-500">
              <T k="od.hosting.note" />
            </p>
          </div>
        </section>

        {/* --- setting one up: a numbered sequence ------------------------- */}
        <section className="gov-rule-top bg-paper-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <h2 className="max-w-3xl font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
              <T k="od.stepsTitle" />
            </h2>
            <ol className="mt-10 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((step, i) => (
                <li key={step} className="border-t-2 border-ink-900 pt-3">
                  <span className="docket text-xs text-ink-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-1 text-base font-semibold text-ink-900">
                    <T k={step} />
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --- closing ----------------------------------------------------- */}
        <section className="gov-rule-top">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:py-16 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-xl font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
              <T k="od.closing" />
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/new" className="btn btn-lg btn-primary">
                <T k="od.create" />
              </Link>
              <Link href="/directory" className="btn btn-lg btn-ghost">
                <T k="od.browse" />
              </Link>
            </div>
          </div>

          {/* Ko-fi sits on OpenDepartment's own pages only, never inside
              somebody else's department -- their members did not come to
              look at the platform's donation button. */}
          <div className="mx-auto flex max-w-7xl flex-col gap-3 border-t border-paper-300 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-500">
              <T k="od.supportBody" />
            </p>
            <KofiButton />
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
