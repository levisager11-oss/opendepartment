import type { MetadataRoute } from "next";
import { absolute, SITE_URL } from "@/lib/seo";

/**
 * Everything under /d/<slug>/ past the front door is either behind a session
 * or belongs to somebody else's members, so it is disallowed wholesale. The
 * front door itself stays crawlable and decides for itself, per department,
 * whether to be indexed -- see generateMetadata in d/[slug]/layout.tsx, which
 * emits noindex for every department that did not opt into the directory.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /account and /new are left crawlable on purpose: they serve a
        // noindex header instead, and a path blocked here is never fetched,
        // so its noindex would never be read.
        disallow: [
          "/api/",
          "/d/*/vault",
          "/d/*/admin",
          "/d/*/upload",
          "/d/*/file/",
          "/d/*/login",
          "/d/*/join",
          "/d/*/auth/",
          "/d/*/onboarding",
          "/d/*/access-denied",
        ],
      },
    ],
    sitemap: absolute("/sitemap.xml"),
    host: SITE_URL,
  };
}
