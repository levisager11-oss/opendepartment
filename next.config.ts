import type { NextConfig } from "next";

/**
 * The Content Security Policy is NOT here any more.
 *
 * A header declared in this file is one fixed string for every request, and a
 * fixed string cannot carry a nonce -- which is why script-src used to say
 * `'unsafe-inline'`, the one directive an XSS actually cares about. It is
 * built per request in src/middleware.ts now, with a nonce and
 * `'strict-dynamic'`, and set on both the request (so Next stamps the nonce
 * onto its own bootstrap scripts) and the response.
 *
 * Deliberately not declared in both places: two Content-Security-Policy
 * headers are INTERSECTED rather than merged, so a permissive one here would
 * not loosen the policy but would quietly make it much harder to reason about.
 *
 * The headers below are per-request-invariant, so they stay. They also reach
 * static assets, which the middleware matcher skips.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Belt and braces with frame-ancestors in the policy the
          // middleware sets, for anything that still reads the older header.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Keeps the slug out of the Referer sent to a third party. A
          // department address is not a secret, but an unlisted one is not
          // meant to travel either.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
