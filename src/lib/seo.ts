import type { Metadata } from "next";

/**
 * The one canonical origin for OpenDepartment.
 *
 * Deliberately NOT the per-request origin that /new uses. Callback URLs must
 * differ per deployment so a preview tells owners to whitelist the preview;
 * canonical URLs must NOT, or every preview deployment competes with
 * production for the same keywords. Preview builds therefore point their
 * canonicals at production, which is exactly what a canonical is for.
 *
 * NEXT_PUBLIC_CANONICAL_URL overrides it once a custom domain is attached.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_CANONICAL_URL ?? "https://opendepartment.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "OpenDepartment";

/** Absolute URL for a site-relative path. */
export function absolute(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * The share card from app/opengraph-image.tsx, addressed explicitly.
 *
 * Next injects that file into a route's metadata only while the route leaves
 * `openGraph` alone; the moment a page defines its own openGraph object to set
 * a title, the inherited image drops off and the page unfurls as a bare link.
 * Every page that sets openGraph therefore has to name the image again, which
 * is the whole reason pageMetadata() below exists.
 */
const OG_IMAGE = {
  url: absolute("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} -- run your own files.`,
};

/**
 * Title, description, canonical and share tags for one indexable page.
 *
 * `title` is the bare page title; the template in the root layout appends the
 * brand for the <title> tag, while og:title stays unbranded because og:site_name
 * already carries the brand and social cards would otherwise say it twice.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

/**
 * Metadata for a page nobody should ever reach from a search result --
 * account pages, sign-in, the setup wizard. Keeping these out of the index
 * matters more than it sounds: a signed-out crawler hitting them gets a
 * redirect or an empty shell, and indexing either wastes crawl budget on the
 * pages that do deserve it.
 *
 * The self-canonical is not an oversight. Without it these pages inherit the
 * root layout's `canonical: "/"` and each one claims to be the home page.
 */
export function privatePage(
  title: string,
  { path, description }: { path?: string; description?: string } = {}
): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false },
    ...(path ? { alternates: { canonical: path } } : {}),
  };
}
