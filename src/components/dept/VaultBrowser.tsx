"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { useTenant, useTenantClient } from "@/lib/tenant/context";
import { FileCard } from "./FileCard";
import {
  STORAGE_BUCKET,
  type CaseFile,
  type FileKind,
  type SortKey,
  type Subject,
} from "@/lib/tenant/types";

const PAGE_SIZE = 24;

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
  isAdmin: boolean;
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

  // Debounce the search box so typing does not fire a query per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const filtersKey = `${debounced}|${sort}|${subjectId}|${category}|${kind}|${mineOnly}`;
  const previousFilters = useRef(filtersKey);

  const load = useCallback(
    async (pageIndex: number, replace: boolean) => {
      setLoading(true);
      setError(false);

      try {
        // Subject is a many-to-many, so resolve it to a set of ids first.
        let restrictTo: string[] | null = null;
        if (subjectId) {
          const { data } = await supabase
            .from("file_subjects")
            .select("file_id")
            .eq("subject_id", subjectId);
          restrictTo = (data ?? []).map((row) => row.file_id as string);
          if (restrictTo.length === 0) {
            setFiles([]);
            setTotal(0);
            setLoading(false);
            return;
          }
        }

        let query = supabase.from("files_public").select("*", { count: "exact" });

        if (restrictTo) query = query.in("id", restrictTo);
        if (category) query = query.eq("category", category);
        if (kind) query = query.eq("kind", kind);
        if (mineOnly) query = query.eq("owner_id", currentUserId);
        if (debounced) {
          const safe = debounced.replace(/[%,()]/g, " ");
          query = query.or(
            `title.ilike.%${safe}%,description.ilike.%${safe}%,original_name.ilike.%${safe}%`
          );
        }

        const { column, ascending } = SORTS[sort];
        query = query
          .order(column, { ascending })
          .order("created_at", { ascending: false })
          .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

        const { data, count, error } = await query;
        if (error) throw error;

        const rows = (data ?? []) as CaseFile[];

        // Merge in this member's own votes. RLS means the query can only ever
        // return their own rows, so nobody can see how anyone else voted.
        const ids = rows.map((r) => r.id);
        if (ids.length) {
          const { data: myVotes } = await supabase
            .from("votes")
            .select("file_id, value")
            .in("file_id", ids);
          const map = new Map(
            (myVotes ?? []).map((v) => [v.file_id as string, v.value as number])
          );
          rows.forEach((r) => {
            r.my_vote = map.get(r.id) ?? 0;
          });
        }

        setTotal(count ?? 0);
        setFiles((prev) => (replace ? rows : [...prev, ...rows]));

        // One batched call for all image thumbnails on this page.
        const imagePaths = rows
          .filter((r) => r.kind === "image")
          .map((r) => r.storage_path);
        if (imagePaths.length) {
          const { data: signed } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrls(imagePaths, 3600);
          if (signed) {
            setThumbs((prev) => {
              const next = { ...prev };
              signed.forEach((entry) => {
                if (entry.signedUrl && entry.path) next[entry.path] = entry.signedUrl;
              });
              return next;
            });
          }
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [supabase, debounced, sort, subjectId, category, kind, mineOnly, currentUserId]
  );

  useEffect(() => {
    const changed = previousFilters.current !== filtersKey;
    previousFilters.current = filtersKey;
    if (changed) setPage(0);
    load(changed ? 0 : page, changed || page === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, page]);

  const hasFilters = Boolean(debounced || subjectId || category || kind || mineOnly);

  function clearFilters() {
    setSearch("");
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="btn btn-ghost"
              >
                {loading ? t("common.loading") : `${files.length} / ${total}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
