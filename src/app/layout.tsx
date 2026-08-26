import type { Metadata, Viewport } from "next";
import { Merriweather, Source_Sans_3, Special_Elite } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import { detectLocale } from "@/lib/i18n/detect";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
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

export const metadata: Metadata = {
  metadataBase: new URL("https://opendepartment.vercel.app"),
  title: "OpenDepartment",
  description:
    "Run your own parody document archive. Your database, your members, your rules.",
  robots: { index: true, follow: true },
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
