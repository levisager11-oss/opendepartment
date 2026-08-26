import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Department } from "@/lib/control/departments";
import { DEFAULT_CATEGORIES } from "./types";

/**
 * Everything that makes a department look like itself.
 *
 * This is the answer to "can they replace Lorenzo with anything else": the
 * name, the noun, the docket prefix and the seal are rows in the tenant's own
 * database, fetched per request. There is no hard-coded subject anywhere in
 * the app.
 */
export type Branding = {
  departmentName: string;
  tagline: string | null;
  subjectLabel: string;
  docketPrefix: string;
  sealTop: string;
  sealBottom: string;
  accent: string;
  categories: string[];
  maxUploadMb: number;
  claimed: boolean;
  /** Public department: anybody may sign up, no invite code needed. */
  openJoin: boolean;
};

export const FALLBACK_BRANDING: Branding = {
  departmentName: "The Department",
  tagline: null,
  subjectLabel: "Case",
  docketPrefix: "CF",
  sealTop: "DEPARTMENT OF RECORDS",
  sealBottom: "OFFICIAL USE ONLY",
  accent: "#b8860b",
  categories: [...DEFAULT_CATEGORIES],
  maxUploadMb: 25,
  claimed: false,
  openJoin: false,
};

/**
 * Read a department's identity without a session.
 *
 * `department_identity()` is security definer and returns only values that are
 * meant to be on the front door, so this works for a signed-out visitor
 * looking at /d/<slug> before they have any account at all.
 */
export const getBranding = cache(
  async (dept: Department): Promise<Branding> => {
    const anon = createClient(dept.supabase_url, dept.anon_key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await anon.rpc("department_identity");
    if (error || !data || data.length === 0) {
      // Schema not installed yet, or the project was deleted. The caller shows
      // the "finish setting this up" screen rather than a broken page.
      return { ...FALLBACK_BRANDING, departmentName: dept.display_name };
    }

    const row = data[0];
    return {
      departmentName: row.department_name ?? dept.display_name,
      tagline: row.tagline ?? dept.tagline,
      subjectLabel: row.subject_label ?? "Case",
      docketPrefix: row.docket_prefix ?? "CF",
      sealTop: row.seal_top ?? FALLBACK_BRANDING.sealTop,
      sealBottom: row.seal_bottom ?? FALLBACK_BRANDING.sealBottom,
      accent: row.accent ?? FALLBACK_BRANDING.accent,
      categories:
        Array.isArray(row.categories) && row.categories.length > 0
          ? row.categories
          : [...DEFAULT_CATEGORIES],
      maxUploadMb: row.max_upload_mb ?? 25,
      claimed: Boolean(row.claimed),
      // Absent on a department that has not re-run the schema since open_join
      // was added, and absent reads as false -- which is the safe way round:
      // the door stays shut until its owner opens it on purpose.
      openJoin: Boolean(row.open_join),
    };
  }
);

/**
 * Whether the tenant project answers at all. Used by the setup wizard to
 * verify the SQL actually ran before it lets someone register the slug.
 */
export async function probeTenant(
  supabaseUrl: string,
  anonKey: string
): Promise<{ ok: boolean; error?: string; claimed?: boolean }> {
  let anon;
  try {
    anon = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return { ok: false, error: "BAD_CREDENTIALS" };
  }

  const { data, error } = await anon.rpc("department_identity");

  if (error) {
    // A missing function is the expected failure when the SQL has not been run
    // yet; anything else usually means the URL or key is wrong.
    const missing =
      error.message?.includes("department_identity") ||
      error.code === "PGRST202";
    return { ok: false, error: missing ? "SCHEMA_MISSING" : "UNREACHABLE" };
  }

  if (!data || data.length === 0) return { ok: false, error: "SCHEMA_MISSING" };
  return { ok: true, claimed: Boolean(data[0].claimed) };
}
