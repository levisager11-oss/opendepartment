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
      parsed[slug.toLowerCase()] = {
        slug: slug.toLowerCase(),
        supabase_url: entry.url.replace(/\/+$/, ""),
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

/** Pinned departments that asked to be listed, for the directory page. */
export function devDirectory(): Department[] {
  return Object.values(registry()).filter((d) => d.visibility === "public");
}
