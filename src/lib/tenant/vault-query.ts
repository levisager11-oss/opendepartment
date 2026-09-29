import type { createTenantBrowserClient } from "./client";
import type { FileKind, SortKey } from "./types";

/**
 * How the vault asks for a page of documents, in one place.
 *
 * Two screens build this query: the vault itself, and the exhibit page when
 * its "next" link has run past the documents the vault loaded and has to
 * fetch the page after them. They must agree exactly -- same filters, same
 * order, same tie-breaks -- or "next" would skip or repeat documents.
 */

export const VAULT_PAGE_SIZE = 24;

export const SORTS: Record<SortKey, { column: string; ascending: boolean }> = {
  top: { column: "score", ascending: false },
  new: { column: "created_at", ascending: false },
  worst: { column: "score", ascending: true },
  views: { column: "view_count", ascending: false },
  discussed: { column: "comment_count", ascending: false },
};

export const VAULT_KINDS: FileKind[] = ["image", "pdf", "video", "audio"];

export type VaultFilters = {
  /** The search box, trimmed. */
  q: string;
  sort: SortKey;
  subject: string;
  category: string;
  kind: string;
  mine: boolean;
};

/** Read filters out of a query string, dropping anything that is not one. */
export function vaultFiltersFromSearch(search: string): VaultFilters {
  const params = new URLSearchParams(search);
  const sort = params.get("sort") ?? "top";
  const kind = params.get("kind") ?? "";
  return {
    q: (params.get("q") ?? "").trim(),
    sort: Object.hasOwn(SORTS, sort) ? (sort as SortKey) : "top",
    subject: params.get("subject") ?? "",
    category: params.get("category") ?? "",
    kind: VAULT_KINDS.includes(kind as FileKind) ? kind : "",
    mine: params.get("mine") === "1",
  };
}

/** The canonical query string for a set of filters ("" when there are none). */
export function vaultSearchFromFilters(filters: VaultFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.sort !== "top") params.set("sort", filters.sort);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.category) params.set("category", filters.category);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.mine) params.set("mine", "1");
  const text = params.toString();
  return text ? `?${text}` : "";
}

/**
 * A search box's term, as a prefix tsquery.
 *
 * `websearch_to_tsquery` would be the obvious call and it is the wrong one
 * here: it matches whole lexemes, so a box that searches while you type finds
 * nothing at all until the last word is finished -- `bud` would not reach
 * `budget`. Every token becomes a prefix instead, ANDed together, which is
 * what a search box is expected to do.
 *
 * The tokens are an ALLOWLIST -- letters, digits and underscore, everything
 * else is a separator. That is what makes assembling tsquery syntax here
 * acceptable where assembling PostgREST filter syntax was not: no token can
 * carry `&`, `|`, `!`, `:` or a quote, so nothing a person types becomes an
 * operator. It also travels as a filter VALUE that PostgREST URL-encodes and
 * hands to to_tsquery, so the worst a malformed one could do is make that
 * function raise -- and by construction none of these are malformed.
 *
 * Capped at eight tokens: past that the query costs more than the answer is
 * worth, and nobody types nine words into a search box on purpose.
 *
 * Null when nothing survives tokenising -- a term of pure punctuation is not a
 * search for nothing, it is not a search.
 */
export function prefixSearchQuery(term: string): string | null {
  const tokens = term
    .toLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(Boolean)
    .slice(0, 8);
  return tokens.length ? tokens.map((token) => `${token}:*`).join(" & ") : null;
}

type TenantClient = ReturnType<typeof createTenantBrowserClient>;

/**
 * The filtered, ordered read of rows `from`..`to` (inclusive) of the vault.
 *
 * The caller names the columns: the vault wants everything a card shows, the
 * exhibit page only ids and titles. PostgREST filters independently of the
 * select list, so the two filtered columns that exist only to be filtered on
 * -- the tsvector and the subject id array -- need not be selected by either.
 */
export function vaultRangeQuery(
  supabase: TenantClient,
  select: string,
  filters: VaultFilters,
  userId: string,
  from: number,
  to: number
) {
  let query = supabase.from("files_public").select(select, { count: "exact" });

  // One request, whatever the subject holds. This used to be a separate
  // round trip that fetched every matching file id and sent them back as an
  // `in` list, so the URL grew with the archive.
  if (filters.subject) query = query.contains("subject_ids", [filters.subject]);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.mine) query = query.eq("owner_id", userId);
  const searchQuery = filters.q ? prefixSearchQuery(filters.q) : null;
  if (searchQuery) {
    // `simple` to match the column's own configuration -- a mismatch here
    // silently stops matching rather than failing loudly.
    query = query.textSearch("search", searchQuery, { config: "simple" });
  }

  // The tie-breaks make the order total. Without them two documents with the
  // same score could swap places between two requests, and paging -- or
  // stepping through with "next" -- would show one twice and skip the other.
  const { column, ascending } = SORTS[filters.sort];
  return query
    .order(column, { ascending })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);
}

/**
 * What the vault has shown in this tab, in order -- the list the exhibit
 * page's previous/next links walk. Per department and per tab
 * (sessionStorage), and tied to the query that produced it so the exhibit
 * page can fetch the page after it with the same filters.
 */
export type VaultTrail = {
  search: string;
  total: number;
  items: Array<{ id: string; title: string }>;
};

export function vaultTrailKey(slug: string): string {
  return `od.vault.trail:${slug}`;
}

export function readVaultTrail(slug: string): VaultTrail | null {
  try {
    const raw = sessionStorage.getItem(vaultTrailKey(slug));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<VaultTrail>;
    if (
      typeof value.search !== "string" ||
      typeof value.total !== "number" ||
      !Array.isArray(value.items) ||
      !value.items.every((item) => typeof item?.id === "string" && typeof item?.title === "string")
    ) {
      return null;
    }
    return value as VaultTrail;
  } catch {
    return null;
  }
}

export function writeVaultTrail(slug: string, trail: VaultTrail): void {
  try {
    sessionStorage.setItem(vaultTrailKey(slug), JSON.stringify(trail));
  } catch {
    // Storage full or disabled: the exhibit page simply offers no neighbours.
  }
}
