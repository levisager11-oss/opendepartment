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
  /**
   * Who answers for this department. Rendered on its own legal pages, which
   * have to be readable by somebody who is not a member -- that is what an
   * imprint is for -- so both come from department_identity() rather than from
   * the members-only settings row.
   */
  operatorName: string | null;
  operatorContact: string | null;
  /**
   * Which version of db/tenant-schema.sql this department has actually run.
   *
   * Null means the question could not be answered: either the project did not
   * respond, or it is running a schema old enough that department_identity()
   * has no such column -- which is itself the answer "older than the first
   * version that could say". Callers must not read a null as up to date, and
   * must not show an administrator a re-run notice on the strength of one
   * alone: reach it only from a path that has already established the project
   * responds, such as a member session that resolved.
   */
  schemaVersion: number | null;
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
  operatorName: null,
  operatorContact: null,
  schemaVersion: null,
};

/**
 * The accent is the one setting that reaches the page as CSS rather than as
 * text: the department layout sets it as the custom property `--accent`, and
 * globals.css substitutes it into real declarations (`background: var(--accent)`,
 * and a color-mix beside it). A custom property is a token stream, so a value
 * carrying a semicolon reparses into EXTRA declarations at every one of those
 * substitution sites -- which is a CSS injection an administrator could aim at
 * every member of their own department.
 *
 * db/tenant-schema.sql now refuses to store anything but six hex digits. This
 * is the same rule applied on the way out, for the department that has not
 * re-run the schema yet: their settings row may already hold a poisoned value,
 * and it must not reach a style attribute on the strength of a promise made in
 * a file they have not run.
 */
const HEX = /^#[0-9a-f]{6}$/i;

function safeAccent(value: unknown): string {
  return typeof value === "string" && HEX.test(value.trim())
    ? value.trim()
    : FALLBACK_BRANDING.accent;
}

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
      accent: safeAccent(row.accent),
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
      // Absent on a department that has not re-run the schema since these were
      // added to department_identity(); the legal page says so rather than
      // inventing a name.
      operatorName: row.operator_name ?? null,
      operatorContact: row.operator_contact ?? null,
      // Absent on any schema older than the one that started recording it, and
      // absent is the signal rather than a gap -- see the field's own note.
      schemaVersion:
        typeof row.schema_version === "number" ? row.schema_version : null,
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
