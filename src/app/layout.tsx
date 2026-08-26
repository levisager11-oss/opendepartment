import type { Metadata, Viewport } from "next";
import { Merriweather, Source_Sans_3, Special_Elite } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { detectLocale } from "@/lib/i18n/detect";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Three families, and the third earns its place: Special Elite is the
 * typewriter register the whole parody rests on -- dockets, stamps, usernames.
 * It ships one weight over the latin subset and only ever sets short strings.
 *
 * The weight lists are the payload, and they are pruned to what actually
 * renders. Merriweather is used at 900 for page titles and 700 for card
 * headings and never at 400, so 400 is not requested; every `font-serif` call
 * site in the app carries an explicit bold or black.
 */
const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-merriweather",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

const specialElite = Special_Elite({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-special-elite",
  display: "swap",
});

const DESCRIPTION =
  "Run your own parody document archive. Members upload exhibits, vote and " +
  "argue in the comments -- stored in a Supabase project you own, not ours. " +
  "Free, invite-only by default, about five minutes to set up.";

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
    default: `${SITE_NAME} -- run your own files`,
    template: `%s -- ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "parody document archive",
    "mock government archive",
    "self-hosted file archive",
    "Supabase",
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
    title: `${SITE_NAME} -- run your own files`,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} -- run your own files`,
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
  themeColor: "#0b1c33",
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
      className={`${merriweather.variable} ${sourceSans.variable} ${specialElite.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
