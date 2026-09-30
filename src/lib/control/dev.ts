import type { Department } from "./departments";

/**
 * Departments pinned by configuration instead of registered in the directory.
 *
 * Two jobs:
 *
 *  1. LOCAL DEVELOPMENT. Slug resolution normally costs a second Supabase
 *     project to hold one row, and the free tier gives two per organisation --
 *     so the directory would eat the slot you wanted for an actual department.
 *
 *  2. SINGLE-DEPARTMENT DEPLOYMENTS. Someone who just wants their own archive
 *     online, with no platform around it, can deploy this app with one pinned
 *     department and never create a control plane at all.
 *
 * Format (one line in .env.local or a Vercel environment variable):
 *
 *   STATIC_DEPARTMENTS={"test":{"url":"https://abc.supabase.co","key":"eyJ...","name":"The Test Files"}}
 *
 * The URL may be Supabase's cloud or a Supabase somebody runs themselves --
 * the second is most of the reason to pin rather than register: a person who
 * wants nothing of theirs on anybody else's servers deploys their own copy of
 * this app next to their own Supabase, and points one at the other here. See
 * pinnedOrigin() for what is accepted.
 *
 * SAFETY: the value comes from the deployment's own environment, never from
 * user input, so this grants nothing that setting the control-plane variables
 * would not. It is also consulted only AFTER the control plane -- a department
 * somebody registered through the wizard can never be shadowed by a pin.
 */

type PinnedEntry = {
  url: string;
  key: string;
  name?: string;
  tagline?: string;
  visibility?: "unlisted" | "public";
};

let parsed: Record<string, Department> | null = null;

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);
const SUPABASE_CLOUD = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/;

/**
 * The origin a pinned department may be served from, or null.
 *
 * HTTPS always, with one exception: plain HTTP on this machine's loopback
 * address, which is what `supabase start` and a local Docker stack serve and
 * which no browser but the developer's own can reach anyway. Anything else
 * over HTTP would put members' sessions on the wire in the clear.
 *
 * Only a bare origin is accepted. Every Supabase client call appends its own
 * path (/rest/v1, /auth/v1, /storage/v1), and the value is also what the
 * Content-Security-Policy is widened by -- a path, a query or credentials in
 * it would be a URL that works nowhere and a policy entry nobody meant.
 */
export function pinnedOrigin(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname.replace(/\/+$/, "") !== "") return null;
  if (url.protocol === "https:") return url.origin;
  if (url.protocol === "http:" && LOOPBACK.has(url.hostname)) return url.origin;
  return null;
}

/** Whether an origin is on Supabase's own cloud, which the CSP already allows. */
export function isSupabaseCloud(origin: string): boolean {
  return SUPABASE_CLOUD.test(origin);
}

function registry(): Record<string, Department> {
  if (parsed) return parsed;
  parsed = {};

  // DEV_DEPARTMENTS is the old name, still read so existing .env.local files
  // keep working.
  const raw = process.env.STATIC_DEPARTMENTS || process.env.DEV_DEPARTMENTS;
  if (!raw) return parsed;

  try {
    const entries = JSON.parse(raw) as Record<string, PinnedEntry>;
    for (const [slug, entry] of Object.entries(entries)) {
      if (!entry?.url || !entry?.key) continue;
      const origin = pinnedOrigin(String(entry.url));
      if (!origin) {
        // Said once at startup rather than failing silently into a 404 that
        // looks exactly like a typo in the slug.
        console.warn(
          `[opendepartment] STATIC_DEPARTMENTS: "${slug}" was skipped -- its url must be https://, or http:// on localhost, with no path`
        );
        continue;
      }
      parsed[slug.toLowerCase()] = {
        slug: slug.toLowerCase(),
        supabase_url: origin,
        anon_key: entry.key,
        display_name: entry.name ?? "Department",
        tagline: entry.tagline ?? null,
        visibility: entry.visibility === "public" ? "public" : "unlisted",
      };
    }
  } catch {
    // A malformed value must not take the whole app down; the slug simply does
    // not resolve and the 404 page explains itself.
    console.warn("[opendepartment] STATIC_DEPARTMENTS is not valid JSON");
  }

  return parsed;
}

/** Look up a pinned department, or null when there is none for this slug. */
export function resolveDevDepartment(slug: string): Department | null {
  return registry()[slug.toLowerCase()] ?? null;
}

/**
 * Origins of pinned departments that are NOT on Supabase's cloud: the servers
 * people run themselves. The proxy adds these to the Content-Security-Policy,
 * because the browser talks to a department's project directly -- sign-in,
 * uploads, the vault's own queries -- and a policy that only knew
 * *.supabase.co would refuse every one of those calls.
 */
export function selfHostedOrigins(): string[] {
  return [
    ...new Set(
      Object.values(registry())
        .map((d) => d.supabase_url)
        .filter((origin) => !isSupabaseCloud(origin))
    ),
  ];
}

/** Pinned departments that asked to be listed, for the directory page. */
export function devDirectory(): Department[] {
  return Object.values(registry()).filter((d) => d.visibility === "public");
}
