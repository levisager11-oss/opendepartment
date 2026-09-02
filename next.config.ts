import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * The wildcards are not laziness: which Supabase project a page talks to is
 * decided per request by the slug, so the origin an exhibit loads from is not
 * knowable at build time. `*.supabase.co` / `.in` is the same closed set the
 * setup probe pins to and the same one the control plane's `supabase_url`
 * CHECK constraint allows, so the policy is exactly as wide as the product is.
 *
 * `object-src` has to include those hosts too: a PDF exhibit renders through
 * <object data={signedUrl}> in FileViewer, and the default of `default-src`
 * would blank it.
 *
 * Honest about `'unsafe-inline'` in script-src: Next injects inline bootstrap
 * scripts, and threading a per-request nonce through middleware that already
 * branches four ways is a change worth making on its own rather than smuggled
 * in beside a header list. So this policy is not an XSS backstop. What it does
 * buy is real: `frame-ancestors` closes clickjacking on the administration
 * screen, `base-uri` and `form-action` close two redirect tricks, and
 * `connect-src` means an injection cannot quietly post anywhere it likes.
 */
const SUPABASE = "https://*.supabase.co https://*.supabase.in";

const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' https://storage.ko-fi.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${SUPABASE} https://storage.ko-fi.com https://cdn.ko-fi.com`,
  `media-src 'self' blob: ${SUPABASE}`,
  `object-src 'self' ${SUPABASE}`,
  `frame-src 'self' ${SUPABASE}`,
  `connect-src 'self' ${SUPABASE}`,
  `font-src 'self' data:`,
  `form-action 'self'`,
  `base-uri 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // Belt and braces with frame-ancestors above, for anything that
          // still reads the older header.
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
