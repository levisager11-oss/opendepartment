import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Special_Elite } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { CookieNotice } from "@/components/CookieNotice";
import { SkipLink } from "@/components/SkipLink";
import { detectLocale } from "@/lib/i18n/detect";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Three families. Inter sets everything a person reads or types; Bricolage
 * Grotesque sets the headlines, and is the one place the product is allowed a
 * bit of character; Special Elite is kept for the rubber stamps, the last
 * piece of typewriter the parody still leans on. It ships one weight over the
 * latin subset and only ever sets short strings.
 *
 * Inter and Bricolage are variable fonts, so leaving `weight` out fetches one
 * file each that covers every weight the app uses -- naming weights would
 * fetch one static file per weight instead.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-special-elite",
  display: "swap",
});

const DESCRIPTION =
  "Run your own private archive, dressed up as a records office. Members " +
  "upload files, vote and argue in the comments, stored in a Supabase project " +
  "you own, hosted or on your own server. Free, invite-only by default, " +
  "about five minutes to set up.";

/**
 * Site-wide metadata. Two things here are load-bearing:
 *
 *  - `title.template` -- every child page sets a bare `title` ("Sign in"),
 *    and without the template those pages would lose the brand entirely in
 *    search results and browser tabs.
 *  - `alternates.canonical: "/"` -- resolved against metadataBase, so each
 *    route that sets its own canonical overrides this and every route that
 *    does not still gets an absolute self-reference rather than none.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · run your own files`,
    // " · " rather than the "--" the prose in this codebase uses: a title is
    // what a search result and a browser tab show, and a double hyphen reads
    // as a typo there.
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "parody document archive",
    "private file archive",
    "self-hosted file archive",
    "Supabase",
    "self-hosted Supabase",
    "classroom roleplay",
    "declassified document generator",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · run your own files`,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · run your own files`,
    description: DESCRIPTION,
  },
  // Note for anyone adding a page below: a page that sets `openGraph` or
  // `twitter` replaces this object wholesale rather than merging into it, and
  // silently loses the share image with it. Use pageMetadata() from lib/seo.
  // The site is not a phone directory; stop Safari turning docket numbers
  // like "LF-0001" into tappable phone links.
  formatDetection: { telephone: false, address: false, email: false },
  verification: { google: "SaTamI2kIpo5f0OCzfcUgvO0unoBJtge3sSRhG_iZnA" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

/**
 * The root layout deliberately renders no header, no footer and no session.
 *
 * There are two different shells below this point -- the marketing site and a
 * department -- and they answer to different Supabase projects. Putting a
 * session lookup here would mean guessing which one before the route is known.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await detectLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${bricolage.variable} ${specialElite.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <I18nProvider initialLocale={locale}>
          <SkipLink />
          {children}
          {/* Site-wide on purpose: the department shell is a separate tree,
              and a notice that only appeared on the platform's own pages
              would miss most of the people reading anything. */}
          <CookieNotice />
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
