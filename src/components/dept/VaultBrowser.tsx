"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { FileCard } from "./FileCard";
import {
  SIGNED_URL_TTL,
  STORAGE_BUCKET,
  type CaseFile,
  type FileKind,
  type SortKey,
  type Subject,
} from "@/lib/tenant/types";

const PAGE_SIZE = 24;

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

const SORTS: Record<SortKey, { column: string; ascending: boolean }> = {
  top: { column: "score", ascending: false },
  new: { column: "created_at", ascending: false },
  worst: { column: "score", ascending: true },
  views: { column: "view_count", ascending: false },
  discussed: { column: "comment_count", ascending: false },
};

const KINDS: FileKind[] = ["image", "pdf", "video", "audio"];

export function VaultBrowser({
  subjects,
  currentUserId,
  initialSubjectId = "",
}: {
  subjects: Subject[];
  currentUserId: string;
  initialSubjectId?: string;
}) {
  const { t, plural } = useI18n();
  const { branding, href } = useTenant();
  const supabase = useTenantClient();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<SortKey>("top");
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState("");
  const [mineOnly, setMineOnly] = useState(false);

  const [files, setFiles] = useState<CaseFile[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);

  // Read after hydration so the server and first client render agree. Native
  // history keeps the current filters shareable without refetching the route.
  useEffect(() => {
    function restoreFilters() {
      const params = new URLSearchParams(window.location.search);
      const query = params.get("q") ?? "";
      const requestedSort = params.get("sort") ?? "top";
      const requestedKind = params.get("kind") ?? "";
      setSearch(query);
      setDebounced(query.trim());
      setSort(Object.hasOwn(SORTS, requestedSort) ? requestedSort as SortKey : "top");
      setSubjectId(params.get("subject") ?? "");
      setCategory(params.get("category") ?? "");
      setKind(KINDS.includes(requestedKind as FileKind) ? requestedKind : "");
      setMineOnly(params.get("mine") === "1");
      setFiltersReady(true);
    }
    restoreFilters();
    window.addEventListener("popstate", restoreFilters);
    return () => window.removeEventListener("popstate", restoreFilters);
  }, []);

  // Debounce the search box so typing does not fire a query per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!filtersReady) return;
    const url = new URL(window.location.href);
    const values = { q: debounced, sort: sort === "top" ? "" : sort,
      subject: subjectId, category, kind, mine: mineOnly ? "1" : "" };
    for (const [key, value] of Object.entries(values)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [filtersReady, debounced, sort, subjectId, category, kind, mineOnly]);

  // Changing two filters quickly leaves two queries in flight, and they do not
  // have to come back in the order they were sent. Every load claims a ticket
  // and drops its own result if a later one has already been issued -- without
  // this, the slower, older query wins and the grid disagrees with the
  // controls above it.
  const latestRequest = useRef(0);

  const load = useCallback(
    async (pageIndex: number, replace: boolean) => {
      const ticket = ++latestRequest.current;
      const stale = () => ticket !== latestRequest.current;

      setLoading(true);
      setError(false);

      try {
        // Named columns rather than `*`, and spelled out in the call rather
        // than hoisted into a constant: supabase-js reads the select list at
        // the TYPE level, so it has to be a literal for the rows to come back
        // typed rather than as a parse error.
        //
        // The view carries two columns now that exist only to be filtered on
        // -- the tsvector and the subject id array -- and neither is worth
        // sending to twenty-four cards. PostgREST filters independently of the
        // select list, so leaving them out costs the filters below nothing.
        let query = supabase
          .from("files_public")
          .select(
            "id, title, description, category, kind, mime_type, size_bytes, original_name, storage_path, thumb_path, upvotes, downvotes, score, comment_count, view_count, case_number, created_at, owner_id, owner_username, subjects",
            { count: "exact" }
          );

        // One request, whatever the subject holds. This used to be a separate
        // round trip that fetched every matching file id and sent them back as
        // an `in` list, so the URL grew with the archive.
        if (subjectId) query = query.contains("subject_ids", [subjectId]);
        if (category) query = query.eq("category", category);
        if (kind) query = query.eq("kind", kind);
        if (mineOnly) query = query.eq("owner_id", currentUserId);
        // Not named `search`: that is the state holding the raw box contents,
        // and shadowing it here would be one rename away from a real bug.
        const searchQuery = debounced ? prefixSearchQuery(debounced) : null;
        if (searchQuery) {
          // `simple` to match the column's own configuration -- a mismatch
          // here silently stops matching rather than failing loudly.
          query = query.textSearch("search", searchQuery, { config: "simple" });
        }

        const { column, ascending } = SORTS[sort];
        query = query
          .order(column, { ascending })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

        const { data, count, error } = await query;
        if (error) throw error;
        if (stale()) return;

        const rows = (data ?? []) as CaseFile[];

        // Merge in this member's own votes. RLS means the query can only ever
        // return their own rows, so nobody can see how anyone else voted.
        const ids = rows.map((r) => r.id);
        if (ids.length) {
          const { data: myVotes, error: votesError } = await supabase
            .from("votes")
            .select("file_id, value")
            .in("file_id", ids);
          if (votesError) throw votesError;
          if (stale()) return;
          const map = new Map(
            (myVotes ?? []).map((v) => [v.file_id as string, v.value as number])
          );
          rows.forEach((r) => {
            r.my_vote = map.get(r.id) ?? 0;
          });
        }

        setTotal(count ?? 0);
        setFiles((prev) => (replace ? rows : [...prev, ...rows]));
        setPage(pageIndex);

        // One batched call for all image thumbnails on this page.
        //
        // The small copy when there is one, the original when there is not:
        // an exhibit filed before thumbnails existed, or one whose thumbnail
        // could not be made, still has to show a picture. The map is keyed by
        // the card's storage_path either way, so FileCard does not have to
        // know which of the two it got.
        const wanted = rows
          .filter((r) => r.kind === "image")
          .map((r) => ({ key: r.storage_path, path: r.thumb_path || r.storage_path }));
        if (wanted.length) {
          const { data: signed } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrls(wanted.map((w) => w.path), SIGNED_URL_TTL);
          if (signed && !stale()) {
            const byPath = new Map(
              signed
                .filter((entry) => entry.signedUrl && entry.path)
                .map((entry) => [entry.path as string, entry.signedUrl as string])
            );
            setThumbs((prev) => {
              const next = { ...prev };
              wanted.forEach(({ key, path }) => {
                const url = byPath.get(path);
                if (url) next[key] = url;
              });
              return next;
            });
          }
        }
      } catch {
        if (!stale()) setError(true);
      } finally {
        if (!stale()) setLoading(false);
      }
    },
    [supabase, debounced, sort, subjectId, category, kind, mineOnly, currentUserId]
  );

  useEffect(() => {
    if (!filtersReady) return;
    void load(0, true);
    return () => { latestRequest.current += 1; };
  }, [filtersReady, load]);

  const hasFilters = Boolean(search || sort !== "top" || subjectId || category || kind || mineOnly);

  function clearFilters() {
    setSearch("");
    setDebounced("");
    setSort("top");
    setSubjectId("");
    setCategory("");
    setKind("");
    setMineOnly(false);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="docket text-2xs text-ink-500">
            {branding.subjectLabel.toUpperCase()} FILE INDEX
          </span>
          <h1 className="font-serif text-2xl font-black break-words text-gov-900 sm:text-3xl">
            {t("vault.title")}
          </h1>
          <p className="typewriter mt-1 text-sm text-ink-500">
            {plural("vault.count", total)}
          </p>
        </div>

        <Link href={href("upload")} className="btn btn-primary">
          <span aria-hidden>+</span> {t("nav.upload")}
        </Link>
      </div>

      <div className="paper mb-6 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" strokeLinecap="round" />
            </svg>
            <input
              className="field field-icon"
              placeholder={t("vault.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("vault.search")}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
            <select
              className="field"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={t("vault.sort")}
            >
              <option value="top">{t("vault.sort.top")}</option>
              <option value="new">{t("vault.sort.new")}</option>
              <option value="worst">{t("vault.sort.worst")}</option>
              <option value="views">{t("vault.sort.views")}</option>
              <option value="discussed">{t("vault.sort.discussed")}</option>
            </select>

            <select
              className="field"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              aria-label={t("vault.filter.subject")}
            >
              <option value="">
                {t("vault.filter.subject")}: {t("vault.filter.all")}
              </option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <select
              className="field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={t("vault.filter.category")}
            >
              <option value="">
                {t("vault.filter.category")}: {t("vault.filter.all")}
              </option>
              {branding.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="field"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              aria-label={t("vault.filter.kind")}
            >
              <option value="">
                {t("vault.filter.kind")}: {t("vault.filter.all")}
              </option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-paper-300 pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
              className="accent-gov-800"
            />
            {t("vault.filter.mine")}
          </label>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer text-xs text-gov-800 underline underline-offset-2 hover:text-gov-600"
            >
              {t("vault.clear")}
            </button>
          )}
        </div>
      </div>

      {loading && files.length === 0 ? (
        <p className="typewriter py-16 text-center text-ink-500">
          {t("vault.loading")}
        </p>
      ) : error ? (
        <div className="paper px-6 py-10 text-center">
          <p className="text-ink-700">{t("common.error")}</p>
          <button
            type="button"
            onClick={() => load(0, true)}
            className="btn btn-ghost mt-4"
          >
            {t("common.retry")}
          </button>
        </div>
      ) : files.length === 0 ? (
        <div className="paper px-6 py-16 text-center">
          <span className="stamp stamp-red text-sm">NO RECORDS</span>
          <p className="mt-5 text-ink-500">
            {hasFilters ? t("vault.empty") : t("vault.emptyAll")}
          </p>
        </div>
      ) : (
        <>
          {loading && <p role="status" className="mb-3 text-sm text-ink-500">{t("vault.loading")}</p>}
          <div aria-busy={loading} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                thumbnail={thumbs[file.storage_path]}
              />
            ))}
          </div>

          {files.length < total && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => load(page + 1, false)}
                disabled={loading}
                className="btn btn-ghost"
              >
                {loading ? t("common.loading") : `${t("vault.more")} (${files.length} / ${total})`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
